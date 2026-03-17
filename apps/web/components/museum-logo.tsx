import Image from "next/image";

export function MuseumLogo() {
  return (
    <Image
      src="/icon.png"
      alt="Museum&"
      width={120}
      height={48}
      className="h-12 w-auto object-contain"
      priority
    />
  );
}
