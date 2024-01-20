function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        fetch('/delete-product/' + productId, { method: 'POST' })
        .then(response => {
            if (response.ok) {
                console.log('Product deleted successfully');
                // Reload the page or remove the product from the list dynamically
                location.reload();
            } else {
                console.error('Failed to delete product');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}
function deletePromotion(promotionId) {
    if (confirm('Are you sure you want to delete this promotion?')) {
        fetch('/delete-promotion/' + promotionId, { method: 'POST' })
        .then(response => {
            if (response.ok) {
                console.log('Promotion deleted successfully');
                // Reload the page or remove the promotion from the list dynamically
                location.reload();
            } else {
                console.error('Failed to delete promotion');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}
function deleteSale(saleId, event) {
    if (confirm('Are you sure you want to delete this sale?')) {
        fetch('/delete-sale/' + saleId, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                // Use the event object to find the clicked button's parent row
                event.target.closest('tr').remove();
                console.log('Sale deleted successfully');
            } else {
                console.error('Failed to delete sale.');
                alert('Failed to delete sale. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error deleting sale. Please try again.');
        });
    }
}

function editProduct(productId, name, price, product_category) {
    // Sanitize the name to prevent XSS - this is a simple version and might need a more robust solution
    const sanitized_name = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    document.getElementById('product_id').value = productId;
    document.getElementById('name').value = sanitized_name;
    document.getElementById('price').value = price;
    document.getElementById('product_category').value = product_category; // Set the category
}


function editPromotion(promoId, name, price, eligibleCategory, selectableQuantities) {
    // Assuming that you have fields for eligibleCategory and selectableQuantities based on your form
    const sanitized_name = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    document.getElementById('promotion_id').value = promoId;
    document.getElementById('promo_name').value = sanitized_name;
    document.getElementById('promo_price').value = price;
    document.getElementById('eligible_category').value = eligibleCategory;
    document.getElementById('selectable_quantities').value = selectableQuantities;
}

// Event listeners to the delete buttons for products
    document.querySelectorAll('.product-delete-btn').forEach(function (button) {
        button.addEventListener('click', function () {
            console.log("Delete product button clicked");
            const productId = this.dataset.productId; // Assuming data-product-id is a number
            deleteProduct(productId);
        });
    });

    // Event listeners to the delete buttons for promotions
    document.querySelectorAll('.promotion-delete-btn').forEach(function (button) {
        button.addEventListener('click', function () {
            console.log("Delete promotion button clicked");
            const promotionId = this.dataset.promoId; // Assuming data-promo-id is a number
            deletePromotion(promotionId);
        });
    });

    // Event listeners to the delete buttons for sales
    document.querySelectorAll('.sale-delete-btn').forEach(function(button) {
        button.addEventListener('click', function(event) {
            console.log("Delete sale button clicked");
            const saleId = this.dataset.saleId;
            deleteSale(saleId, event); // Pass the event to the deleteSale function
        });
    });
