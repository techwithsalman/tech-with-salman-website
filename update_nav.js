const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const dirs = ['.', 'products', 'about', 'contact', 'blogs'];
let allFiles = [];
dirs.forEach(d => {
    if (fs.existsSync(d)) {
        const files = fs.readdirSync(d).filter(f => f.endsWith('.html'));
        files.forEach(f => allFiles.push(path.join(d, f)));
    }
});

const navHtml = `
    <div class="nav-spotlight-pill" id="nav-spotlight-pill"></div>
    <a href="/">HOME</a>
    <a href="/about/">ABOUT</a>
    <a href="/#services">SERVICES</a>
    <a href="/#honors">AI & AUTOMATION</a>
    <a href="/products/">PRODUCTS</a>
    <a href="/#skills">SKILLS</a>
    <a href="/#experience">EXPERIENCE</a>
    <a href="/blogs/">BLOGS</a>
    <a href="/privacy-policy">PRIVACY POLICY</a>
    <a href="/terms.html">TERMS & CONDITIONS</a>
    <a href="/contact/">CONTACT</a>
`;

allFiles.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    let $ = cheerio.load(html);

    // 1. Ensure Logo Clickable
    const brand = $('.nav-brand');
    if (brand.length) {
        brand.empty().append(`<a href="/" style="text-decoration:none;color:inherit;cursor:pointer;">TECH WITH SALMAN</a>`);
    }

    // 2. Navigation
    const nav = $('#vengence-nav-links');
    if (nav.length) {
        nav.empty().append(navHtml);
        
        // Active state mapping
        nav.find('a').removeClass('active');
        if (file === 'index.html') {
            nav.find('a[href="/"]').addClass('active');
        } else if (file.includes('about')) {
            nav.find('a[href="/about/"]').addClass('active');
        } else if (file.includes('blogs')) {
            nav.find('a[href="/blogs/"]').addClass('active');
        } else if (file.includes('products')) {
            nav.find('a[href="/products/"]').addClass('active');
        } else if (file.includes('contact')) {
            nav.find('a[href="/contact/"]').addClass('active');
        } else if (file.includes('privacy')) {
            nav.find('a[href="/privacy-policy"]').addClass('active');
        } else if (file.includes('terms')) {
            nav.find('a[href="/terms.html"]').addClass('active');
        }
    }

    fs.writeFileSync(file, $.html(), 'utf8');
});

console.log("Global nav updates completed.");
