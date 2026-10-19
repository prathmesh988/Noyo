import React from 'react';
import { motion } from 'framer-motion';

const LOGO_URL = '/noyo-icon.svg';

/**
 * LogoLoader Component — Noyo branded loader (Powered by Appzeto)
 * @param {boolean} fullScreen - If true, shows a full-screen overlay
 * @param {boolean} overlay - If true with fullScreen, uses solid background
 * @param {boolean} inline - For inline use (e.g. buttons)
 * @param {string} size - Size classes for the logo
 */
const LogoLoader = ({ fullScreen = false, overlay = false, inline = false, size = "w-20 h-20" }) => {
  const containerClasses = fullScreen
    ? overlay
      ? "fixed inset-0 flex items-center justify-center bg-white dark:bg-light-bg z-[9999]"
      : "fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-light-bg/85 backdrop-blur-sm z-[100]"
    : inline
      ? "flex items-center justify-center"
      : "flex items-center justify-center w-full min-h-[85vh] pb-20";

  return (
    <div 
      className={containerClasses}
      style={!inline ? { backgroundColor: 'var(--background)' } : {}}
    >
      <div className="flex flex-col items-center gap-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0.7 }}
          animate={{
            scale: [0.9, 1.05, 0.9],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`relative ${inline ? 'w-8 h-8' : size} flex items-center justify-center`}
        >
          <img
            src={LOGO_URL}
            alt="Noyo"
            className="w-full h-full object-contain"
          />
          {/* Subtle ripple effect */}
          {!inline && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2"
              style={{ borderColor: 'rgba(179, 58, 53, 0.4)' }}
              animate={{
                scale: [1, 1.35],
                opacity: [0.6, 0]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          )}
        </motion.div>

        {!inline && (
          <div className="flex flex-col items-center gap-0.5">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: '14px',
                color: 'var(--text-primary, #18181B)',
                letterSpacing: '0.12em',
              }}
            >
              NOYO
            </motion.p>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: '8.5px',
                color: '#71717A',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              Powered by Appzeto
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoLoader;

