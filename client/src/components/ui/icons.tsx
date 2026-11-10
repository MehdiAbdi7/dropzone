import type { ReactNode } from "react";

// Les petites icônes au trait du site, dessinées sur une grille de 24 px.
// Elles sont décoratives (aria-hidden) : le texte ou l'aria-label du bouton dit ce qu'il fait.
type IconProps = { size?: number; className?: string };

function Icon({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4.5 4.5" />
  </Icon>
);

export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </Icon>
);

export const CartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 7h15l-1.5 9h-12z" />
    <path d="M6 7 5 3H2" />
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
  </Icon>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const MoonIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" />
  </Icon>
);

export const ArrowRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const InstagramIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </Icon>
);

export const GlobeIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
  </Icon>
);

export const TruckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 6h12v10H2zM14 9h4.5l3.5 3.5V16h-8" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icon>
);

export const CashIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6 10v4M18 10v4" />
  </Icon>
);

export const ClipboardCheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3h6v1M9 13l2 2 4-4" />
  </Icon>
);

export const StoreIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-6h6v6" />
  </Icon>
);

export const PackageIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </Icon>
);

export const DocumentIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 3h7l5 5v13H7z" />
    <path d="M14 3v5h5M10 13h6M10 17h6" />
  </Icon>
);

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6M12 16.5h.01" />
  </Icon>
);

export const SwapIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8h14l-3-3M20 16H6l3 3" />
  </Icon>
);

export const EyeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

// Les icônes des caractéristiques sur l'affiche d'une série (voir specIcon).
const SPEC_PATHS: Record<string, ReactNode> = {
  screen: <rect x="7" y="2" width="10" height="20" rx="2" />,
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <circle cx="12" cy="13.5" r="3.5" />
      <path d="M8 7l2-3h4l2 3" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 11v2M6 10v4M10 10v4" />
    </>
  ),
  plug: <path d="M8 3v5M16 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3" />,
  memory: (
    <>
      <rect x="2" y="7" width="20" height="10" rx="1" />
      <path d="M6 17v3M10 17v3M14 17v3M18 17v3M6 10h3v4H6zM15 10h3v4h-3z" />
    </>
  ),
  storage: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  gpu: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="9" cy="12" r="3" />
      <path d="M15 10h4M15 14h4" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="3" />,
};

export const SpecGlyph = ({ icon, ...props }: IconProps & { icon: string }) => (
  <Icon {...props}>{SPEC_PATHS[icon] ?? SPEC_PATHS.dot}</Icon>
);

// Les icônes de la barre du bas du back-office (05/11).
export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 11 12 4l9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </Icon>
);

export const GridIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Icon>
);

export const PhoneIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </Icon>
);

export const ListIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </Icon>
);

export const UsersIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3.5 2.9 3.5 6" />
  </Icon>
);

export const DotsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="8" cy="12" r=".6" fill="currentColor" />
    <circle cx="12" cy="12" r=".6" fill="currentColor" />
    <circle cx="16" cy="12" r=".6" fill="currentColor" />
  </Icon>
);

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 4h4v16h-4" />
    <path d="M10 8l-4 4 4 4M6 12h10" />
  </Icon>
);
