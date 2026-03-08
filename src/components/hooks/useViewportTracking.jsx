import { useEffect, useState, useRef, useCallback } from 'react';

export function useViewportTracking(sectionIds = [], onViewportChange = null) {
  const [visibleSections, setVisibleSections] = useState([]);
  const [focusedSection, setFocusedSection] = useState(null);
  const [sectionData, setSectionData] = useState({});
  const sectionRefs = useRef({});
  const callbackTimeoutRef = useRef(null);

  useEffect(() => {
    if (!sectionIds || sectionIds.length === 0) {
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1.0]
    };

    const observerCallback = (entries) => {
      const visibleList = [];
      const dataMap = {};

      entries.forEach((entry) => {
        const sectionId = entry.target.id;
        
        dataMap[sectionId] = {
          isVisible: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          boundingClientRect: entry.boundingClientRect
        };

        if (entry.isIntersecting) {
          visibleList.push({
            id: sectionId,
            ratio: entry.intersectionRatio
          });
        }
      });

      setSectionData(dataMap);
      setVisibleSections(visibleList.map(v => v.id));

      if (visibleList.length > 0) {
        const mostVisible = visibleList.reduce((max, current) =>
          current.ratio > max.ratio ? current : max
        );
        setFocusedSection(mostVisible.id);
      } else {
        setFocusedSection(null);
      }

      // Debounce callback to prevent excessive updates (300ms delay)
      if (onViewportChange) {
        if (callbackTimeoutRef.current) {
          clearTimeout(callbackTimeoutRef.current);
        }
        
        callbackTimeoutRef.current = setTimeout(() => {
          onViewportChange({
            visible: visibleList.map(v => v.id),
            focused: visibleList.length > 0 ? visibleList.reduce((max, current) =>
              current.ratio > max.ratio ? current : max
            ).id : null,
            data: dataMap
          });
        }, 300);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sectionIds.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
        sectionRefs.current[sectionId] = element;
      }
    });

    return () => {
      observer.disconnect();
      if (callbackTimeoutRef.current) {
        clearTimeout(callbackTimeoutRef.current);
      }
    };
  }, [sectionIds.join(','), onViewportChange]);

  const scrollToSection = useCallback((sectionId) => {
    const element = sectionRefs.current[sectionId] || document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return {
    visibleSections,
    focusedSection,
    scrollToSection,
    sectionData
  };
}