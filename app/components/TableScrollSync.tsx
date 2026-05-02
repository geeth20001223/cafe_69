'use client';
import { useEffect } from 'react';

/**
 * TableScrollSync
 * 
 * Automatically detects elements with the .table-wrap class and adds a secondary 
 * horizontal scrollbar at the top of the table. 
 * This ensures that users can scroll horizontally without having to find the 
 * bottom of the table first, while maintaining natural vertical scroll behavior.
 */
export default function TableScrollSync() {
  useEffect(() => {
    const updateScrollbars = () => {
      const wraps = document.querySelectorAll('.table-wrap');
      
      wraps.forEach((wrap: any) => {
        const table = wrap.querySelector('table');
        if (!table) return;

        const isOverflowing = table.scrollWidth > wrap.clientWidth;
        
        // Prevent double injection
        if (wrap.dataset.scrollSynced === 'true') {
          const mirror = wrap.previousElementSibling;
          if (mirror && mirror.classList.contains('table-scrollbar-top')) {
            const inner = mirror.querySelector('div');
            if (inner) {
              inner.style.width = `${table.scrollWidth}px`;
              mirror.style.display = isOverflowing ? 'block' : 'none';
            }
          } else if (isOverflowing) {
            // If somehow the mirror was removed but flag is still there, re-add or ignore
            wrap.dataset.scrollSynced = 'false';
          }
          return;
        }

        if (!isOverflowing) return;

        // Create the mirror scrollbar div
        const mirror = document.createElement('div');
        mirror.className = 'table-scrollbar-top';
        mirror.style.overflowX = 'auto';
        mirror.style.overflowY = 'hidden';
        mirror.style.width = '100%';
        mirror.style.height = '12px'; 
        mirror.style.background = 'rgba(0,0,0,0.05)';
        mirror.style.marginBottom = '-1px'; // Slight overlap to look connected
        mirror.style.position = 'sticky';
        mirror.style.top = '0';
        mirror.style.zIndex = '5';
        mirror.style.display = isOverflowing ? 'block' : 'none';

        const inner = document.createElement('div');
        inner.style.width = `${table.scrollWidth}px`;
        inner.style.height = '1px';
        mirror.appendChild(inner);

        // Inject mirror before the table wrap
        wrap.parentNode.insertBefore(mirror, wrap);
        wrap.dataset.scrollSynced = 'true';

        // Synchronize scroll events
        mirror.onscroll = () => {
          wrap.scrollLeft = mirror.scrollLeft;
        };
        wrap.onscroll = () => {
          mirror.scrollLeft = wrap.scrollLeft;
        };
      });
    };

    // Initial run
    const timer = setTimeout(updateScrollbars, 500);
    
    // Watch for DOM changes (navigation, modals opening)
    const observer = new MutationObserver(() => {
      updateScrollbars();
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });

    // Watch for window resizing
    window.addEventListener('resize', updateScrollbars);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', updateScrollbars);
    };
  }, []);

  return null;
}
