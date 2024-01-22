let selectedProducts = [];
let selectedPromotions = [];
    
    document.querySelectorAll('.product-button').forEach(function (button) {
        button.addEventListener('click', function () {
        console.log("Product button clicked.");
        let productInfo = this.innerText.split(" - ");
        let productId = Number(this.getAttribute('data-product-id'));
        let productName = productInfo[0];
        let productPrice = parseInt(productInfo[1].replace(/[^0-9]/g, ''), 10);
        let productCategory = productInfo[2].replace('Category: ', '').trim(); // Remove 'Category: ' prefix and trim

        let existingProduct = selectedProducts.find(p => p.productId === productId);
        if (existingProduct) {
            existingProduct.quantity++;
        } else {
            selectedProducts.push({
                productId, 
                productName, 
                quantity: 1, 
                saleValue: productPrice, 
                category: productCategory // Now should match exactly with eligibleCategories
            });
        }
        updateTemporaryListAndSummary(selectedProducts, selectedPromotions);
    });

    document.querySelectorAll('.promo-button').forEach(function (button) {
    button.addEventListener('click', function () {
        let promoId = this.getAttribute('data-promo-id');
        let promoDetails = this.innerText.split(" - ");
        let promoName = promoDetails[0];
        let promoPrice = parseInt(promoDetails[1].replace(/[^0-9]/g, ''), 10);
        let promotionCategory = promoDetails[2].replace('Category: ', '').trim(); // Extract promotion category
            console.log(promotionCategory)
            // Find the promotion object using promoId
            let promotion = promotions.find(p => p.id == promoId);
    
            if (promotion) {
                console.log(`Promotion found: ${JSON.stringify(promotion)}`);
                
                // Validate the promotion with these parsed values
                let productsInPromotion = validatePromotion(promoId, selectedProducts);
                if (productsInPromotion) {
                    console.log(`Promotion is valid.`);
                    // Check if this promotion is already added
                    if (!selectedPromotions.some(p => p.promoId === promoId)) {
                        selectedPromotions.push({
                            promoId,
                            promoName,
                            promoPrice,
                            promotionCategory // Added promotion category here
                        });
    
                        // Mark the products as part of a promotion
                        selectedProducts.forEach(product => {
                            if (productsInPromotion.has(product.productId)) {
                                product.isPromotionItem = true;
                                // Set the saleValue to 0 for products that are part of this promotion
                                product.saleValue = 0;
                            }
                        });
                    }
                } else {
                    console.log(`Promotion conditions not met.`);
                }
            } else {
                console.error('Promotion not found');
            }
            console.log(selectedPromotions)
            updateTemporaryListAndSummary(selectedProducts, selectedPromotions);

        });
    });

    document.addEventListener('DOMContentLoaded', function() {
        let registerSaleButton = document.getElementById('register-sale');
        if (registerSaleButton && !registerSaleButton.listenerAdded) {
            registerSaleButton.addEventListener('click', function() {
                console.log("Register sale button clicked");
            document.getElementById('summary-popup').style.display = 'block';
        });
        registerSaleButton.listenerAdded = true;
    }
    
    if (document.getElementById('confirm-sale-button')) {
        let confirmSaleButton = document.getElementById('confirm-sale-button');
        if (confirmSaleButton && !confirmSaleButton.listenerAdded) {
            confirmSaleButton.addEventListener('click', async (event) => {
                console.log("Confirm sale button clicked");
    
                // Prepare a copy of products for submission
                let productsForSubmission = selectedProducts.map(product => ({
                    productId: product.productId,
                    productName: product.productName,
                    quantity: product.quantity,
                    saleValue: product.isPromotionItem ? 0 : product.saleValue,
                    productCategory: product.category  // Add product category
                }));

                let promotionsForSubmission = selectedPromotions.map(promo => ({
                    promoId: promo.promoId,
                    promoName: promo.promoName,
                    promoPrice: promo.promoPrice,
                    promotionCategory: promo.promotionCategory // Added here
                }));    
                console.log('promotions for submition:',promotionsForSubmission)
                try {
                    const response = await fetch('/sales', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ products: productsForSubmission, promotions: promotionsForSubmission })
                    });
                    const data = await response.json();
                    
                    if (data.status === 'success') {
                        console.log('Sale registered successfully');
                        // Reset the selected items and any other necessary state
                        selectedProducts = []; // Clear selected products
                        selectedPromotions = []; // Clear selected promotions
                        document.getElementById('selected-items').innerHTML = '';
                        document.getElementById('summary-popup').style.display = 'none';
                        updateTemporaryListAndSummary(selectedProducts, selectedPromotions);
                    } else if (data.status === 'error') {
                        alert(data.message); // Display the error message from the server
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error registering sale. Please try again.');
                }
            });
            confirmSaleButton.listenerAdded = true;
        }
    }

        // Event listener for the clear sales button
        if (document.getElementById('clear-sales')) {
            let clearSalesButton = document.getElementById('clear-sales');
            clearSalesButton.addEventListener('click', function() {
                console.log("Clear sales button clicked");
                // Reset the selected items and any other necessary state
                selectedProducts = []; // Clear selected products
                selectedPromotions = []; // Clear selected promotions
                document.getElementById('selected-items').innerHTML = ''; // Clear the list in the DOM
                // If you have any other UI elements that need resetting, do it here
                updateTemporaryListAndSummary(selectedProducts, selectedPromotions);
            });
        }
    
        console.log("Finished initializing event listeners");
    });
    

    function validatePromotion(promoId, selectedProducts) {
        let promotion = promotions.find(p => p.id == promoId);
        if (!promotion) {
            console.log(`Promotion with ID ${promoId} not found.`);
            return false;
        }
    
        let productsInPromotion = new Map(); // Use a map to track product ID and quantities used
        let eligibleCategories = promotion.eligible_category.split(',');
        let requiredQuantities = promotion.selectable_quantities.split(',').map(Number);
    
        for (let i = 0; i < eligibleCategories.length; i++) {
            let category = eligibleCategories[i].trim();
            let requiredQuantity = requiredQuantities[i];
            let quantityCount = 0;
    
            console.log(`Checking category: ${category} with required quantity: ${requiredQuantity}`);
    
            selectedProducts.forEach(product => {
                let alreadyCounted = productsInPromotion.get(product.productId) || 0;
            
                console.log(`Product ID: ${product.productId}, Category: ${product.category}, Product Quantity: ${product.quantity}, Already Counted: ${alreadyCounted}`);
            
                if (product.category === category) {
                    let availableQuantity = product.quantity - alreadyCounted; // Calculate the available quantity
                    let neededQuantity = Math.min(availableQuantity, requiredQuantity - quantityCount); // Determine how much of this product we can count
            
                    if (neededQuantity > 0) {
                        productsInPromotion.set(product.productId, alreadyCounted + neededQuantity);
                        quantityCount += neededQuantity;
                    }
                }
            });
            
            console.log(`Total found quantity for category ${category}: ${quantityCount}`);
            
            console.log(`Total found quantity for category ${category}: ${quantityCount}`);
    
            if (quantityCount < requiredQuantity) {
                console.log(`Insufficient quantity for category ${category}. Required: ${requiredQuantity}, Found: ${quantityCount}`);
                return false; // Not enough products for this promotion
            }
        }
    
        console.log(`Products in promotion: ${JSON.stringify(Array.from(productsInPromotion.entries()))}`);
        return productsInPromotion;
    }
    

function updateTemporaryListAndSummary(selectedProducts, selectedPromotions) {
    let temporaryList = document.getElementById('selected-items');
    let orderDetails = document.getElementById('order-details');
    let totalValue = 0;

    // Clear the current list
    temporaryList.innerHTML = '';
    orderDetails.innerHTML = '';

    // Track which promotions have been applied to avoid duplicates in the summary
    let promotionsApplied = new Set();

    // Calculate total for individual products and add to list
    selectedProducts.forEach(product => {
        // Determine if the product is part of any promotion
        let isPartOfPromotion = selectedPromotions.some(promo => {
            if (promotionsApplied.has(promo.promoId)) {
                return false; // This promotion has already been applied
            }
            let productsInPromotion = validatePromotion(promo.promoId, selectedProducts);
            if (productsInPromotion instanceof Map && productsInPromotion.has(product.productId)) {
                promotionsApplied.add(promo.promoId); // Mark this promotion as applied
                return true;
            }
            return false;
        });

        // Calculate the product total based on whether it's part of a promotion
        let productTotal = isPartOfPromotion ? 0 : product.quantity * product.saleValue;
        totalValue += productTotal;

        // Create list item for the product
        let listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        let productDetail = `${product.productName} - $${product.saleValue} x ${product.quantity} = $${productTotal}`;
        if (isPartOfPromotion) {
            productDetail += ' (Part of Promotion)';
        }
        listItem.textContent = productDetail;
        temporaryList.appendChild(listItem);

        // Create order detail item for the product
        let detailItem = document.createElement('p');
        detailItem.textContent = productDetail;
        orderDetails.appendChild(detailItem);
    });

// Add total for each unique promotion and list it in the summary
selectedPromotions.forEach(promo => {
    if (promotionsApplied.has(promo.promoId)) {
        totalValue += promo.promoPrice;

        let promoListItem = document.createElement('li');
        promoListItem.className = 'list-group-item promotion-item';
        promoListItem.textContent = `${promo.promoName} - $${promo.promoPrice}`;
        temporaryList.appendChild(promoListItem);

        let promoDetailItem = document.createElement('p');
        promoDetailItem.textContent = `${promo.promoName} - Total: $${promo.promoPrice}`;
        orderDetails.appendChild(promoDetailItem);
    }
    console.log(`Adding promotion to summary: ${promo.promoName}`);
});


    // Update the total display
    document.getElementById('order-total').textContent = `Total Value: $${totalValue}`;
}

window.hidePopup = function () {
    document.getElementById('summary-popup').style.display = 'none';
}
})