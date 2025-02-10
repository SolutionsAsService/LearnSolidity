// JavaScript for toggling the theme

// Select the theme switcher button by its ID
const themeSwitcher = document.getElementById('theme-switcher');

// Add a click event listener to toggle the 'dark-mode' class on the body element
themeSwitcher.addEventListener('click', function() {
  document.body.classList.toggle('dark-mode');

  // Optional: Persist the theme selection using localStorage
  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('theme', 'dark');
  } else {
    localStorage.setItem('theme', 'light');
  }
});

// Optional: Check localStorage for the theme preference on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
});
