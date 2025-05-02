document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('header');
    const backToTopButton = document.getElementById('backToTop');
    const headerHeight = header.offsetHeight;
    let scrolling = false;
    let lastScrollPosition = 0;
    let headerVisible = true;
    
    // Function to handle scrolling behavior
    function handleScroll() {
        const currentScrollPosition = window.pageYOffset;
        
        // If we've scrolled past the threshold (300px), show the back-to-top button
        if (currentScrollPosition > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
        
        // Make header sticky after scrolling past it
        if (currentScrollPosition > headerHeight * 1.5) {
            if (!header.classList.contains('sticky') && currentScrollPosition < lastScrollPosition) {
                // Only add sticky when scrolling up past the threshold
                header.classList.add('sticky');
            } else if (header.classList.contains('sticky') && currentScrollPosition > lastScrollPosition) {
                // Remove sticky when scrolling down
                header.classList.remove('sticky');
            }
        } else {
            // Remove sticky when at the top of the page
            header.classList.remove('sticky');
        }
        
        lastScrollPosition = currentScrollPosition;
        scrolling = false;
    }
    
    // Throttle scroll events for better performance
    window.addEventListener('scroll', function() {
        if (!scrolling) {
            window.requestAnimationFrame(function() {
                handleScroll();
            });
            scrolling = true;
        }
    });
    
    // Back to top button click handler
    backToTopButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});