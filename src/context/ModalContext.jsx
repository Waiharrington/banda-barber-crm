import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ModalContext = createContext({ modalCount: 0, pushModal: () => {}, popModal: () => {} });

export const ModalProvider = ({ children }) => {
  const [modalCount, setModalCount] = useState(0);

  const pushModal = useCallback(() => setModalCount(c => c + 1), []);
  const popModal  = useCallback(() => setModalCount(c => Math.max(0, c - 1)), []);

  // Lock/unlock body scroll based on whether any modal is open
  useEffect(() => {
    if (modalCount > 0) {
      // Save current scroll position and lock body
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [modalCount]);

  return (
    <ModalContext.Provider value={{ isModalOpen: modalCount > 0, pushModal, popModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);

/**
 * Wrap any modal component with this to auto-register/unregister it.
 * Usage: <ModalShield active={showModal}> ... </ModalShield>
 */
export const ModalShield = ({ active, children }) => {
  const { pushModal, popModal } = useModal();

  useEffect(() => {
    if (active) {
      pushModal();
      return () => popModal();
    }
  }, [active]);

  return children;
};
