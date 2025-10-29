const API_URL = "http://localhost:5000/api/admin";

// Add Book
document.getElementById("addBookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const author = document.getElementById("author").value;
  const isbn = document.getElementById("isbn").value;

  await fetch(`${API_URL}/add-book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, author, isbn })
  });

  alert("Book added!");
  fetchBooks(); // refresh list
});

// Get all books
async function fetchBooks() {
  const res = await fetch(`${API_URL}/books`);
  const books = await res.json();
  const table = document.querySelector("#bookTable tbody");
  table.innerHTML = "";

  books.forEach(book => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.isbn}</td>
      <td><button onclick="deleteBook('${book._id}')">Delete</button></td>
    `;
    table.appendChild(row);
  });
}

fetchBooks();

// Delete book
async function deleteBook(id) {
  if (confirm("Are you sure you want to delete this book?")) {
    await fetch(`${API_URL}/book/${id}`, { method: "DELETE" });
    fetchBooks();
  }
}
