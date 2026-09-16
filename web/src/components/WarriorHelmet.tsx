import React from "react";

interface ChemtechMaskProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Emblema de ARKANIA — Máscara Chemtech / Rebreather táctico
 * Inspirado en el bajomundo tóxico, respiradores industriales y estética underground.
 */
export default function WarriorHelmet({
  size = 28,
  className = "",
  color = "#00ff66",
}: ChemtechMaskProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Placa frontal / cúpula blindada con hendiduras */}
      <path
        d="M12 2L4 6V11C4 16.5 7.5 20.8 12 22C16.5 20.8 20 16.5 20 11V6L12 2Z"
        fill="#0d1410"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Lentes / Visores oculares angulares con brillo químico */}
      <polygon
        points="6.5,9.5 10.5,10.5 9.5,12.5 6,11.5"
        fill={color}
      />
      <polygon
        points="17.5,9.5 13.5,10.5 14.5,12.5 18,11.5"
        fill={color}
      />

      {/* Filtro / Respirador central tipo gasmask con rejilla */}
      <rect
        x="10"
        y="14"
        width="4"
        height="5"
        rx="1"
        fill="#141e17"
        stroke={color}
        strokeWidth="1.2"
      />
      <line x1="10.8" y1="15.5" x2="13.2" y2="15.5" stroke={color} strokeWidth="1" />
      <line x1="10.8" y1="17.5" x2="13.2" y2="17.5" stroke={color} strokeWidth="1" />

      {/* Válvulas químicas laterales de respirador */}
      <circle cx="7" cy="16" r="1.6" fill="#141e17" stroke={color} strokeWidth="1.2" />
      <circle cx="17" cy="16" r="1.6" fill="#141e17" stroke={color} strokeWidth="1.2" />

      {/* Marca de peligro / Biohazard en la frente */}
      <circle cx="12" cy="6.2" r="1" fill={color} />
      <path d="M12 4.2V5.2M10.8 7.2L11.5 6.6M13.2 7.2L12.5 6.6" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}
