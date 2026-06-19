const heroShowcase = document.getElementById('main-hero-showcase');
    const track = document.getElementById('hero-carousel-track');
    if (heroShowcase && track) {
        const slides = Array.from(track.querySelectorAll('.carousel-slide'));
        const nextButton = document.getElementById('main-carousel-next');
        const prevButton = document.getElementById('main-carousel-prev');
        const dotsContainer = document.getElementById('main-carousel-dots');
        const dots = Array.from(dotsContainer.querySelectorAll('.dot'));
        
        let currentIndex = 0;
        let autoplayInterval = null;
        let isHovered = false;

        const updateCarousel = (index) => {
            if (index < 0) index = slides.length - 1;
            if (index >= slides.length) index = 0;
            
            currentIndex = index;

            track.style.transform = `translateX(-${currentIndex * (100 / slides.length)}%)`;

            dots.forEach(dot => dot.classList.remove('active'));
            dots[currentIndex].classList.add('active');
        };

        const nextSlide = () => {
            updateCarousel(currentIndex + 1);
        };

        const prevSlide = () => {
            updateCarousel(currentIndex - 1);
        };

        const startAutoplay = () => {
            stopAutoplay();
            if (!isHovered) {
                autoplayInterval = setInterval(nextSlide, 5000);
            }
        };

        const stopAutoplay = () => {
            if (autoplayInterval) {
                clearInterval(autoplayInterval);
                autoplayInterval = null;
            }
        };

        const resetAutoplay = () => {
            stopAutoplay();
            startAutoplay();
        };

        if (nextButton) {
            nextButton.addEventListener('click', (e) => {
                e.stopPropagation();
                nextSlide();
                resetAutoplay();
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', (e) => {
                e.stopPropagation();
                prevSlide();
                resetAutoplay();
            });
        }

        dots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                updateCarousel(index);
                resetAutoplay();
            });
        });

        startAutoplay();

        heroShowcase.addEventListener('mouseenter', () => {
            isHovered = true;
            stopAutoplay();
        });

        heroShowcase.addEventListener('mouseleave', () => {
            isHovered = false;
            startAutoplay();
        });
    }



    initFilterListeners();
    initSorting();
    
    console.log('Interacciones de Out Silver cargadas con éxito.');
