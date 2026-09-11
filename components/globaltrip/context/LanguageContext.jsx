"use client";
import React, { useState } from 'react';
import { translations } from '../translations';
import LanguageContext from './languageContextInstance';

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('es');

    const t = (path) => {
        const keys = path.split('.');
        let result = translations[language];

        for (const key of keys) {
            if (result[key]) {
                result = result[key];
            } else {
                return path; // Fallback to path if not found
            }
        }
        return result;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
