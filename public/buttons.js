document.addEventListener('DOMContentLoaded', function() {
    async function fetchByGenre(clicked, category, page_loader){
        const page = document.getElementById(`${category}-1-skel`);
        const offset = 0; // Start from first item
        const limit = 20;
        page.innerHTML = '';
        const spinnerHTML = `
            <div class="category-spinner-hold" id="${category}-category-spinner-hold">
                <div id="spinner" class="spinner-hold">
                    <div class="ytp-spinner" data-layer="4">
                        <div>
                            <div class="ytp-spinner-container">
                                <div class="ytp-spinner-rotator">
                                    <div class="ytp-spinner-left">
                                        <div class="ytp-spinner-circle"></div>
                                    </div>
                                    <div class="ytp-spinner-right">
                                        <div class="ytp-spinner-circle"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        page.innerHTML = spinnerHTML;
        //get the spinner
        const spinner = document.getElementById(`${category}-category-spinner-hold`);
        spinner.style.display = "none";
        const genreParam = encodeURIComponent(JSON.stringify(clicked));
        const res = await fetch(`/load-more-category?category=${category}&offset=${offset}&limit=${limit}&genre=${genreParam}`);
        const data = await res.json();
        console.log(data);
        // Append new items to the container
        data.movies.forEach((movie) => {
            const item = document.createElement('div');
            item.className = 'item';
            const img = new Image();
            img.src = movie.poster;
            img.onload = () => {
                item.innerHTML = `
                    <div class="item-image" style="background-image: url('${movie.poster}');" onclick="window.location.href='/details/${movie._id}'"></div>
                    <div class="item-desc">
                        <p class="name">${movie.title.split(' ').length > 6 ? movie.title.split(' ').slice(0, 6).join(' ') + '...' : movie.title}</p>
                        <p class="rating">${movie.imdb.rating}</p>
                    </div>`;
                page.insertBefore(item,spinner);
            }
            img.onerror = () => {
                item.innerHTML = `
                    <div class="item-image" style="background-image: url('default.png');" onclick="window.location.href='/details/${movie._id}'"></div>
                    <div class="item-desc">
                        <p class="name">${movie.title.split(' ').length > 6 ? movie.title.split(' ').slice(0, 6).join(' ') + '...' : movie.title}</p>
                        <p class="rating">${movie.imdb.rating}</p>
                    </div>`;
                page.insertBefore(item,spinner);    
            }
        });
        // Remove page loader and show spinner after items have been added
        if (Array.isArray(data.movies) && data.movies.length > 0) {
            page_loader.style.display = 'none';
            spinner.style.display = 'flex';
        } else {
            page_loader.style.display = 'flex';
            spinner.style.display = 'none';
        }
        createObserver(category,clicked);
    };
    // Your fetch and button creation code here
      fetch('data.json')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('category-buttons');
            if (!container) {
                console.log('Container not found');
                return;
            }
            /*container.innerHTML = '';*/
            document.getElementById("all").addEventListener("click", fetchAll);
            //all button
            var clicked = [];
            //category from page
            const page_category = document.querySelector('script[src="/buttons.js"]').getAttribute('data-category');
            //pagecategoryspinner
            const spinner = document.getElementById("page-category-spinner");
            //page
            const page = document.getElementById(`${page_category}-1-skel`);
            //add all button
            const all_category = document.querySelector('#all');
            function fetchAll(){
                const buttons = document.querySelectorAll('.category-button');
                buttons.forEach(button => {
                    button.style.backgroundColor = 'rgba(255,255,255,0.3)';
                });
                all_category.style.backgroundColor = '#ef5e65';
                clicked = [];
                spinner.style.display = 'flex';
                fetchByGenre(clicked, page_category, spinner);
            }
            data.categories.forEach(category => {
                const button = document.createElement('button');
                button.innerText = category;
                button.classList.add('category-button');
                button.addEventListener('click', () => {
                    all_category.style.backgroundColor = 'rgba(255,255,255,0.3)';
                    if (clicked.includes(category)) {
                        button.style.backgroundColor = 'rgba(255,255,255,0.3)';
                        clicked = clicked.filter(item => item !== category);
                        if (clicked.length === 0) {
                            all_category.click();
                        }
                    } else {
                        button.style.backgroundColor = '#ef5e65';
                        clicked.push(category);
                    }
                    spinner.style.display = 'flex';
                    fetchByGenre(clicked, page_category , spinner);
                });
                container.appendChild(button);
            });
        })
        .catch(error => console.log('Error loading categories:', error));
});