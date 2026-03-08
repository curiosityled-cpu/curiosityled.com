import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * usePageIntelligence Hook
 * Automatically collects generic page context for Atreus
 */
export const usePageIntelligence = () => {
  const location = useLocation();
  const [intelligence, setIntelligence] = useState({});

  const collectContext = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    const hash = location.hash.replace('#', '');

    // Collect viewport information
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      scrollPercentage: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100) || 0
    };

    // Collect visible sections (elements with data-atreus-section attribute)
    const sections = document.querySelectorAll('[data-atreus-section]');
    const visibleSections = [];
    let focusedSection = null;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (isVisible) {
        const sectionId = section.getAttribute('data-atreus-section');
        const sectionLabel = section.getAttribute('data-atreus-label') || sectionId;
        visibleSections.push({ id: sectionId, label: sectionLabel });

        // Focused section is the one most centered in viewport
        const centerDistance = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
        if (!focusedSection || centerDistance < focusedSection.distance) {
          focusedSection = { id: sectionId, label: sectionLabel, distance: centerDistance };
        }
      }
    });

    // Parse URL parameters as filters
    const filters = {};
    searchParams.forEach((value, key) => {
      if (key !== 'view' && key !== 'tab' && key !== 'id') {
        filters[key] = value.includes(',') ? value.split(',') : value;
      }
    });

    return {
      viewport,
      viewport_focus: {
        focused_section: focusedSection?.id || null,
        focused_label: focusedSection?.label || null,
        visible_sections: visibleSections.map(s => s.id),
        section_labels: Object.fromEntries(visibleSections.map(s => [s.id, s.label])),
        section_count: sections.length
      },
      url_filters: Object.keys(filters).length > 0 ? filters : null,
      hash_state: hash || null
    };
  }, [location]);

  useEffect(() => {
    // Initial collection
    setIntelligence(collectContext());

    // Re-collect on scroll (debounced)
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIntelligence(collectContext());
      }, 300);
    };

    // Re-collect on resize (debounced)
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setIntelligence(collectContext());
      }, 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(resizeTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [collectContext]);

  return intelligence;
};