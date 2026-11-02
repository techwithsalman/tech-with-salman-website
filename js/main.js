/**
 * Social Media OS & Tech With Salman — Marketing Website Script
 * Minimal, dependency-free Vanilla JavaScript
 */

/**
 * Centralized Games Configuration
 * Extendable list of games surfaced in the navigation dropdown & mobile accordion.
 * Future games can be added here without redesigning the menu markup.
 */
const GAMES_CONFIG = [
  {
    id: 'highway-racer',
    title: 'Highway Racer 3D',
    description: '3D curved highway racing with dynamic traffic & pro cockpit',
    url: '/games/highway-racer/',
    badge: 'Play Now',
    badgeClass: 'badge-play-now',
    hasLiveDot: true,
    available: true,
    iconClass: 'game-icon-racer'
  },
  {
    id: 'cricket-07',
    title: 'Cricket 07',
    description: 'Free arcade browser cricket batting & boundary challenge',
    url: '/games/cricket-07/',
    badge: 'Coming Soon',
    badgeClass: 'badge-coming-soon',
    hasLiveDot: false,
    available: false,
    iconClass: 'game-icon-cricket'
  }
];

if (typeof window !== 'undefined') {
  window.TWS_GAMES_CONFIG = GAMES_CONFIG;
}

document.addEventListener('DOMContentLoaded', () => {
  const siteHeader = document.querySelector('.site-header');
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  const mobileNavDrawer = document.querySelector('.mobile-nav-drawer');
  const navLinks = document.querySelectorAll('a[href^="#"]');

  // Sticky Header scroll styling
  const handleScroll = () => {
    if (window.scrollY > 30) {
      siteHeader?.classList.add('scrolled');
    } else {
      siteHeader?.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Desktop Games Dropdown Interactions
  const initGamesDropdown = () => {
    const dropdownItem = document.getElementById('nav-games-item');
    const dropdownToggle = document.getElementById('games-dropdown-toggle');
    const dropdownMenu = document.getElementById('games-dropdown-menu');

    if (!dropdownItem || !dropdownToggle || !dropdownMenu) return;

    const menuItems = Array.from(dropdownMenu.querySelectorAll('[role="menuitem"]'));
    let hoverTimeout = null;

    const openDropdown = () => {
      clearTimeout(hoverTimeout);
      dropdownItem.classList.add('open');
      dropdownToggle.setAttribute('aria-expanded', 'true');
    };

    const closeDropdown = () => {
      clearTimeout(hoverTimeout);
      dropdownItem.classList.remove('open');
      dropdownToggle.setAttribute('aria-expanded', 'false');
    };

    const toggleDropdown = () => {
      const isOpen = dropdownItem.classList.contains('open');
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    };

    // Toggle on button click
    dropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    // Hover with 150ms debounce for natural feel
    dropdownItem.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      openDropdown();
    });

    dropdownItem.addEventListener('mouseleave', () => {
      hoverTimeout = setTimeout(() => {
        closeDropdown();
      }, 150);
    });

    // Outside click dismissal
    document.addEventListener('click', (e) => {
      if (!dropdownItem.contains(e.target)) {
        closeDropdown();
      }
    });

    // Keyboard navigation
    dropdownToggle.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Down') {
        e.preventDefault();
        openDropdown();
        if (menuItems.length > 0) menuItems[0].focus();
      } else if (e.key === 'Escape' || e.key === 'Esc') {
        closeDropdown();
      }
    });

    menuItems.forEach((item, index) => {
      item.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Down') {
          e.preventDefault();
          const nextIndex = (index + 1) % menuItems.length;
          menuItems[nextIndex].focus();
        } else if (e.key === 'ArrowUp' || e.key === 'Up') {
          e.preventDefault();
          const prevIndex = (index - 1 + menuItems.length) % menuItems.length;
          menuItems[prevIndex].focus();
        } else if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          closeDropdown();
          dropdownToggle.focus();
        }
      });
    });

    // Close when tabbing outside dropdown
    dropdownMenu.addEventListener('focusout', (e) => {
      if (!dropdownItem.contains(e.relatedTarget)) {
        closeDropdown();
      }
    });
  };

  initGamesDropdown();

  // Mobile Menu & Games Accordion
  if (hamburgerBtn && mobileNavDrawer) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = mobileNavDrawer.classList.toggle('open');
      hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
    });

    // Games Accordion inside Mobile Drawer
    const mobileGamesAccordion = document.getElementById('mobile-games-accordion');
    const mobileGamesToggle = document.getElementById('mobile-games-toggle');
    const mobileGamesPanel = document.getElementById('mobile-games-panel');

    if (mobileGamesAccordion && mobileGamesToggle && mobileGamesPanel) {
      mobileGamesToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = mobileGamesAccordion.classList.toggle('open');
        mobileGamesToggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // Close mobile drawer when clicking a link inside it
    const drawerLinks = mobileNavDrawer.querySelectorAll('a');
    drawerLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileNavDrawer.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      });
    });

    // Close when clicking outside mobile drawer
    document.addEventListener('click', (e) => {
      if (!mobileNavDrawer.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        mobileNavDrawer.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Smooth scroll with sticky navbar offset
  navLinks.forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#' && targetId.startsWith('#')) {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          const navOffset = 90;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });
});
