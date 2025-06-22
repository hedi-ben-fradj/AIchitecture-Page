import type { SVGProps } from 'react';

export const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    className="text-primary"
  >
    <path
      d="M12 2L2 9.25V22H9.5V16.5H14.5V22H22V9.25L12 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M9.5 9.5L12 12M12 12L14.5 9.5M12 12V16.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
