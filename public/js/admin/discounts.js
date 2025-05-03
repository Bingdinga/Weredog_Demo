document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const discountsTableBody = document.getElementById('discounts-table-body');
    const createDiscountBtn = document.getElementById('create-discount-btn');
    const discountModal = document.getElementById('discount-modal');
    const discountForm = document.getElementById('discount-form');
    const closeModal = document.querySelector('.close');
    const cancelDiscountBtn = document.getElementById('cancel-discount');
    const modalTitle = document.getElementById('modal-title');

    // Load discounts
    loadDiscounts();

    // Event listeners
    createDiscountBtn.addEventListener('click', () => openModal());
    closeModal.addEventListener('click', () => discountModal.style.display = 'none');
    cancelDiscountBtn.addEventListener('click', () => discountModal.style.display = 'none');
    discountForm.addEventListener('submit', handleDiscountSubmit);

    window.addEventListener('click', (e) => {
        if (e.target === discountModal) {
            discountModal.style.display = 'none';
        }
    });

    // Functions
    function loadDiscounts() {
        fetch('/api/admin/discounts')
            .then(response => response.json())
            .then(discounts => {
                displayDiscounts(discounts);
            })
            .catch(error => {
                console.error('Error loading discounts:', error);
                showNotification('Error loading discounts', 'error');
            });
    }

    function displayDiscounts(discounts) {
        discountsTableBody.innerHTML = '';

        discounts.forEach(discount => {
            const row = document.createElement('tr');
            
            let discountType = 'Fixed Amount';
            let discountValue = `$${discount.discount_amount.toFixed(2)}`;
            
            if (discount.discount_percent) {
                discountType = 'Percentage';
                discountValue = `${discount.discount_percent}%`;
            }

            const validTo = discount.valid_to ? new Date(discount.valid_to).toLocaleDateString() : 'No expiry';
            const maxUses = discount.max_uses || 'Unlimited';

            row.innerHTML = `
                <td>${discount.code}</td>
                <td>${discountType}</td>
                <td>${discountValue}</td>
                <td>$${discount.minimum_order_amount || 0}</td>
                <td>${validTo}</td>
                <td>${discount.times_used || 0}</td>
                <td>${maxUses}</td>
                <td>
                    <button class="btn-small edit-discount" data-id="${discount.code_id}">Edit</button>
                    <button class="btn-small delete-discount" data-id="${discount.code_id}">Delete</button>
                </td>
            `;
            discountsTableBody.appendChild(row);

            // Add event listeners
            const editBtn = row.querySelector('.edit-discount');
            editBtn.addEventListener('click', () => editDiscount(discount));

            const deleteBtn = row.querySelector('.delete-discount');
            deleteBtn.addEventListener('click', () => deleteDiscount(discount.code_id));
        });
    }

    function openModal(discount = null) {
        if (discount) {
            modalTitle.textContent = 'Edit Discount Code';
            document.getElementById('discount-id').value = discount.code_id;
            document.getElementById('code').value = discount.code;
            document.getElementById('discount-type').value = discount.discount_percent ? 'percent' : 'amount';
            document.getElementById('discount-value').value = discount.discount_percent || discount.discount_amount;
            document.getElementById('minimum-order').value = discount.minimum_order_amount || '';
            
            if (discount.valid_to) {
                const date = new Date(discount.valid_to);
                document.getElementById('valid-to').value = date.toISOString().slice(0, 16);
            }
            
            document.getElementById('max-uses').value = discount.max_uses || '';
            document.getElementById('is-single-use').checked = discount.is_single_use;
        } else {
            modalTitle.textContent = 'Create Discount Code';
            discountForm.reset();
            document.getElementById('discount-id').value = '';
        }
        
        discountModal.style.display = 'block';
    }

    function editDiscount(discount) {
        openModal(discount);
    }

    function deleteDiscount(discountId) {
        if (!confirm('Are you sure you want to delete this discount code?')) {
            return;
        }

        fetch(`/api/admin/discounts/${discountId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Discount deleted successfully', 'success');
                    loadDiscounts();
                }
            })
            .catch(error => {
                console.error('Error deleting discount:', error);
                showNotification('Error deleting discount', 'error');
            });
    }

    function handleDiscountSubmit(e) {
        e.preventDefault();

        const formData = new FormData(discountForm);
        const discountId = document.getElementById('discount-id').value;
        const isEdit = !!discountId;

        const discountData = {
            code: formData.get('code'),
            minimum_order_amount: formData.get('minimumOrderAmount') || 0,
            valid_to: formData.get('validTo') || null,
            max_uses: formData.get('maxUses') || null,
            is_single_use: formData.get('isSingleUse') === 'on'
        };

        if (formData.get('discountType') === 'percent') {
            discountData.discount_percent = formData.get('discountValue');
        } else {
            discountData.discount_amount = formData.get('discountValue');
        }

        const url = isEdit ? `/api/admin/discounts/${discountId}` : '/api/admin/discounts';
        const method = isEdit ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(discountData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(`Discount ${isEdit ? 'updated' : 'created'} successfully`, 'success');
                    discountModal.style.display = 'none';
                    loadDiscounts();
                }
            })
            .catch(error => {
                console.error('Error saving discount:', error);
                showNotification('Error saving discount', 'error');
            });
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});