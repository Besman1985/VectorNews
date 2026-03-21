import Image from "next/image";
import logoImage from "@/logo/logo.png";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src={logoImage}
        alt="Логотип VectorNews"
        className="h-11 w-auto shrink-0"
        priority
      />
      <div>
        <div className="text-xs uppercase tracking-[0.35em] text-mist">Международная редакция</div>
        <div className="text-2xl font-semibold tracking-tight text-white">
          <span className="text-[#7d8fbb]">Vector</span>
          <span className="text-gold">News</span>
        </div>
      </div>
    </div>
  );
}
