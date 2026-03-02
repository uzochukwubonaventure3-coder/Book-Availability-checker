
async function loadBooks() {
  const res = await fetch('http://localhost:5000/books');
  const books = await res.json();

  const list = document.getElementById('bookList');
  list.innerHTML = books.map(
    book => `
      <div>
        <h3>${book.title}</h3>
        <p>${book.author}</p>
        <p>${book.available ? ' Available' : ' Not Available'}</p>
        <p>${book.isbn}</p>
        <p>${book.qauntity}</p>
        <p>${book.price}</p>
      </div>
    `
  ).join('');
}

loadBooks();

