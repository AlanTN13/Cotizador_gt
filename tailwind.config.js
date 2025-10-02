  /** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
     // colores calcados del look streamlit-like
extend: {
    colors: {
      brand: {
        dark: "#0B1B3B",   // azul muy oscuro (títulos)
        text: "#0E2A5A",   // azul para texto normal/labels
        border: "#D6E4FF", // celeste borde
        light: "#F3F7FF",  // celeste fondo
      }
    }
    }  
    },
    plugins: [],
  };
  