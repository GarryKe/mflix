document.querySelectorAll('.actual').forEach(item => {
    const img = new Image();
    const backgroundImage = item.style.backgroundImage.slice(5, -2);
    img.src = backgroundImage;
    img.onerror = () => {
        item.style.backgroundImage = 'url(default.png)';
    };
});
//get the category
const category = document.querySelector('script[src="/movies-tvshows-observer.js"]').getAttribute('data-category');
let genre = [];
//observer to load more-movies in movies category page
const createObserver = (category,genre) => {
    const container = document.getElementById(`${category}-1-skel`);
    const spinner = document.getElementById(`${category}-category-spinner-hold`);
    let offset = 20; // Start after the first 5 items
    const limit = 20; // Fetch 5 items at a time
    //check what genre to search
    let loading = false;
    const observer = new IntersectionObserver(async (entries)=>{
        const entry = entries[0];
        if(entry.isIntersecting && !loading){
            loading = true;
            const res = await fetch(`/load-more-category?category=${category}&offset=${offset}&limit=${limit}&genre=${encodeURIComponent(JSON.stringify(genre))}`);
            const data = await res.json();
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
                    container.insertBefore(item,spinner);
                };
                img.onerror = () => {
                    item.innerHTML = `
                        <div class="item-image" style="background-image: url('default.png');" onclick="window.location.href='/details/${movie._id}'"></div>
                        <div class="item-desc">
                            <p class="name">${movie.title.split(' ').length > 6 ? movie.title.split(' ').slice(0, 6).join(' ') + '...' : movie.title}</p>
                            <p class="rating">${movie.imdb.rating}</p>
                        </div>`;
                    container.insertBefore(item,spinner);
                };
            });
            // Update offset for next batch
            offset += limit;
            loading = false;
            // If no more items, stop observing
            if (data.movies.length < limit) {
                spinner.style.display = 'none';
                observer.disconnect();
            }
        }
    },{threshold:1});
    observer.observe(spinner);
};
createObserver(category,genre);