document.addEventListener('DOMContentLoaded', function() {
    const deleteButtons = document.querySelectorAll('.sale-delete-btn');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const saleId = this.getAttribute('data-sale-id');
            if(confirm('Are you sure you want to delete this sale?')) {
                deleteSale(saleId);
            }
        });
    });
});

function deleteSale(saleId) {
    fetch('/delete-sale/' + saleId, {
        method: 'POST'
    }).then(response => {
        if (response.ok) {
            alert('Sale deleted successfully');
            location.reload();  // Reload the page to update the table
        } else {
            alert('Failed to delete sale');
        }
    }).catch(error => {
        console.error('Error:', error);
        alert('Error deleting sale');
    });
}
