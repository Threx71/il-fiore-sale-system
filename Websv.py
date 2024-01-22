from flask import Flask, render_template, request, jsonify, redirect
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import text
import pytz

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'  # Adjust the URI as needed
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Sales(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sale_group_id = db.Column(db.Integer)  # Group ID for the sale
    product_id = db.Column(db.Integer, nullable=False)
    product_name = db.Column(db.String(100), nullable=False)  # Name of the product
    product_category = db.Column(db.String(100), nullable=True)
    promotion_category = db.Column(db.String(100), nullable=True)    
    quantity = db.Column(db.Integer, nullable=False)
    sale_value = db.Column(db.Integer, nullable=False)  # Calculated value of the sale
    sale_datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)  # Datetime of sale submission

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    product_category = db.Column(db.String(100), nullable=True)

class Promotion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    promotion_category = db.Column(db.String(100), nullable=True)
    eligible_category = db.Column(db.String(100), nullable=True)  # New field replacing constant_product_id and selectable_group_ids
    selectable_quantities = db.Column(db.String(100), nullable=False)  # Comma-separated string of quantities for IDs

def is_product_in_promotion(product_id, promotions):
    for promo_data in promotions:
        promotion = Promotion.query.get(promo_data['promoId'])
        if not promotion:
            continue
        included_product_ids = [int(id) for id in promotion.included_ids.split(',')]
        if product_id in included_product_ids:
            return True
    return False

def add_sale_record(sale_group_id, product_id, product_name, quantity, sale_value):
    new_sale = Sales(
        sale_group_id=sale_group_id,
        product_id=product_id,
        product_name=product_name,
        quantity=quantity,
        sale_value=sale_value
    )
    db.session.add(new_sale)

def promotion_to_dict(promotion):
    return {
        'id': promotion.id,
        'name': promotion.name,
        'price': promotion.price,
        'promotion_category': promotion.promotion_category,
        'eligible_category': promotion.eligible_category,
        'selectable_quantities': promotion.selectable_quantities
    }

@app.route('/')
def route1():
    # Your logic here (if any)
    return redirect('/sales')

@app.route('/sales', methods=['GET', 'POST'])
def sales():
    if request.method == 'POST':
        return handle_post_request()
    else:  # Assuming GET request
        return show_sales_page()

def handle_post_request():
    if not request.is_json:
        return jsonify({'status': 'error', 'message': 'Request must be JSON'}), 400

    try:
        data = request.get_json()
        sale_group_id = generate_sale_group_id()

        # Convert UTC to Chile/Santiago timezone
        santiago_timezone = pytz.timezone('Chile/Continental')
        sale_datetime = datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(santiago_timezone)

        # Handling individual products
        for product_data in data.get('products', []):
            product_id = product_data.get('productId')
            quantity = int(product_data.get('quantity'))
            sale_value = float(product_data.get('saleValue'))
            is_promotion_item = product_data.get('isPromotionItem', False)
            product_category = product_data.get('productCategory')

            product = Product.query.get(product_id)
            if product:
                new_sale = Sales(
                    sale_group_id=sale_group_id,
                    product_id=product_id,
                    product_name=product.name,
                    quantity=quantity,
                    sale_value=sale_value if not is_promotion_item else 0,
                    sale_datetime=sale_datetime,
                    product_category=product_category
                )
                db.session.add(new_sale)

        # Handling promotions
        for promo_data in data.get('promotions', []):
            promo_id = int(promo_data.get('promoId'))
            promotion = Promotion.query.get(promo_id)
            promotion_category = promo_data.get('promotionCategory')
            if promotion:
                new_promo_sale = Sales(
                    sale_group_id=sale_group_id,
                    product_id=promo_id,
                    product_name=promotion.name,
                    quantity=1,
                    sale_value=promotion.price,
                    sale_datetime=sale_datetime,
                    promotion_category=promotion_category
                )
                db.session.add(new_promo_sale)
        db.session.commit()
        return jsonify({'status': 'success'})

    except Exception as e:
        print("Error processing POST request:", e)
        return jsonify({'status': 'error', 'message': str(e)}), 400

def show_sales_page():
    products = Product.query.all()
    promotions = Promotion.query.all()
    promotion_dicts = [promotion_to_dict(promo) for promo in promotions]
    return render_template('sales.html', products=products, promotions=promotion_dicts)

def generate_sale_group_id():
    # Implement logic to generate a unique group ID
    return int(datetime.utcnow().timestamp())

@app.route('/sales-record')
def view_sales():
    all_sales = Sales.query.all()  # Retrieve all sales records
    return render_template('sales_record.html', sales=all_sales)  # Pass records to the template

@app.route('/products', methods=['GET', 'POST'])
def add_or_edit_product():
    if request.method == 'POST':
        product_id = request.form.get('product_id')
        name = request.form.get('name')
        price = request.form.get('price')
        product_category = request.form.get('product_category')  # Get the product category from the form

        if product_id:  # If product_id exists, update the existing product
            product = Product.query.get(product_id)
            if product:
                product.name = name
                product.price = price
                product.product_category = product_category  # Update the product category
        else:  # Otherwise, add a new product
            new_product = Product(name=name, price=price, product_category=product_category)
            db.session.add(new_product)
        db.session.commit()
        return redirect('/products')

    products = Product.query.all()
    promotions = Promotion.query.all()  # Make sure this is outside any conditional logic.
    return render_template('products.html', products=products, promotions=promotions)


@app.route('/add-promotion', methods=['GET', 'POST'])
def add_or_edit_promotion():
    if request.method == 'POST':
        promotion_id = request.form.get('promotion_id')
        name = request.form.get('promo_name')
        price = request.form.get('promo_price')
        promotion_category = request.form.get('promotion_category')
        eligible_category = request.form.get('eligible_category')
        selectable_quantities = request.form.get('selectable_quantities')

        if promotion_id:  # If promotion_id exists, update the existing promotion
            promotion = Promotion.query.get(promotion_id)
            if promotion:
                promotion.name = name
                promotion.price = price
                promotion.promotion_category = promotion_category,  # Assuming this is set through some other means or is not mandatory
                promotion.eligible_category = eligible_category  # Update the eligible category
                promotion.selectable_quantities = selectable_quantities
        else:  # Otherwise, add a new promotion
            new_promotion = Promotion(
                name=name,
                price=price,
                promotion_category=promotion_category,  
                eligible_category=eligible_category, 
                selectable_quantities=selectable_quantities
            )
            db.session.add(new_promotion)

        db.session.commit()
        return redirect('/add-promotion')

    promotions = Promotion.query.all()
    products = Product.query.all()  # To show products for reference
    return render_template('products.html', products=products, promotions=promotions)

@app.route('/delete-product/<int:product_id>', methods=['POST'])
def delete_product(product_id):
    product_to_delete = Product.query.get_or_404(product_id)
    db.session.delete(product_to_delete)
    db.session.commit()
    return jsonify({'status': 'success'}), 200

@app.route('/delete-promotion/<int:promotion_id>', methods=['POST'])
def delete_promotion(promotion_id):
    promotion_to_delete = Promotion.query.get_or_404(promotion_id)
    db.session.delete(promotion_to_delete)
    db.session.commit()
    return jsonify({'status': 'success'}), 200

@app.route('/delete-sale/<int:sale_id>', methods=['POST'])
def delete_sale(sale_id):
    sale_to_delete = Sales.query.get(sale_id)
    if sale_to_delete:
        db.session.delete(sale_to_delete)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Sale deleted successfully'}), 200
    else:
        return jsonify({'status': 'error', 'message': 'Sale not found'}), 404

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create the database tables

    app.run(debug=False, port=5000, host='0.0.0.0')
    