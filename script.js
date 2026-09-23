// Set up tab navigation
const tabs = document.querySelectorAll('nav a');
const sections = document.querySelectorAll('section');

tabs.forEach(tab => {
  tab.addEventListener('click', event => {
    event.preventDefault();
    const target = event.target.getAttribute('href');
    
    // Deactivate all tabs and hide all sections
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.style.display = 'none');

    // Activate clicked tab and show its section
    event.target.classList.add('active');
    document.querySelector(target).style.display = 'block';
  });
});


// Set up nav hotspots
const navLinks = document.querySelectorAll('#nav a');

navLinks.forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const target = event.target.getAttribute('href');

    // Hide all nav screens
    const navScreens = document.querySelectorAll('#nav img');
    navScreens.forEach(screen => screen.style.opacity = '0');

    // Show target screen
    document.querySelector(target).style.opacity = '1';
  });
});