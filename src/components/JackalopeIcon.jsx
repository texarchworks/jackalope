export default function JackalopeIcon({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* Jackalope antlers */}
      <path
        d="M62 58 L58 38 L54 45 L56 42 L52 28 M72 56 L76 38 L80 45 L78 42 L82 28"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Jackalope ears */}
      <path
        d="M58 58 L55 46 L62 55 M74 56 L79 46 L72 55"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Jackalope head */}
      <ellipse cx="67" cy="62" rx="10" ry="8" stroke="currentColor" strokeWidth="2.5" fill="none" />
      {/* Jackalope eye */}
      <circle cx="63" cy="60" r="1.5" fill="currentColor" />
      {/* Jackalope nose */}
      <circle cx="57" cy="63" r="1" fill="currentColor" />
      {/* Jackalope body */}
      <ellipse cx="67" cy="76" rx="20" ry="13" stroke="currentColor" strokeWidth="2.5" fill="none" />
      {/* Jackalope front legs */}
      <path
        d="M52 84 L46 100 L50 100 M56 86 L52 100 L56 100"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Jackalope hind legs */}
      <path
        d="M78 84 L82 100 L78 100 M84 82 L90 100 L86 100"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Jackalope cotton tail */}
      <circle cx="88" cy="74" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Cowboy - torso sitting on jackalope */}
      <path
        d="M62 66 L62 48"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Cowboy head */}
      <circle cx="62" cy="42" r="5" stroke="currentColor" strokeWidth="2.5" fill="none" />
      {/* Cowboy hat brim */}
      <path
        d="M52 38 L72 38"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Cowboy hat crown */}
      <path
        d="M56 38 L57 30 L67 30 L68 38"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cowboy arm holding on */}
      <path
        d="M62 54 L54 60"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Cowboy arm waving */}
      <path
        d="M62 52 L74 44"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Cowboy legs/boots */}
      <path
        d="M62 66 L54 76 L50 76 M62 66 L70 76 L74 76"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ground dust lines */}
      <path
        d="M34 100 L96 100"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}
