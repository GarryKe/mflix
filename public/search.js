const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };
  
  const searchMovies = async (query) => {
    try {
      const response = await fetch(`/search?q=${query}`);
      if (!response.ok) {
        throw new Error("Failed to fetch movies");
      }
      const movies = await response.json();
      if (movies.length === 0) {
        // Show the 'No matches found' message
        document.querySelector(".no-match").style.display = "flex";
      } else {
        // Hide the 'No matches found' message
        document.querySelector(".no-match").style.display = "none";
      };
      displayResults(movies);
    } catch (error) {
      console.error("Error fetching movies:", error);
    }
  };
  
  const handleInputChange = debounce((event) => {
    const query = event.target.value;
    if (query) {
      searchMovies(query);
    } else {
      displayResults([]); // Clear results if query is empty
    }
  }, 300); // 300ms debounce delay
  
  const displayResults = (movies) => {
    const resultsContainer = document.getElementById("suggestions");
    resultsContainer.innerHTML = ""; // Clear previous results
    movies.forEach((movie) => {
      // Generate the HTML structure for each movie
      const movieItemHTML = `
        <div id="suggestion-item">
          <div id="suggestion-img" onclick="window.location.href='/details/${movie._id}'" style="background-image: url(${movie._source.poster || 'default.png'});"></div>
          <p id="suggestion-name" onclick="window.location.href='/details/${movie._id}'">${movie._source.title}</p>
        </div>
      `;
  
      // Append the generated HTML to the results container
      resultsContainer.innerHTML += movieItemHTML;
    });
  };   
  
  document.getElementById("searchInput").addEventListener("input", handleInputChange);  