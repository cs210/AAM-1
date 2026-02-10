import Image from "next/image";

export function YamiLogo() {
  return (
    <Image
      src="/logo.png"
      alt="YAMI"
      width={286}
      height={102}
      className="h-12 w-auto object-contain"
      priority
    />
  );
}
