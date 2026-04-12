export default function ChaletMarker({ chalet, onClick, style }) {
  return (
    <div
      className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: style.left, top: style.top }}
      onClick={() => onClick(chalet)}
    >
      {/* أيقونة شاليه (تأكد من وجود صورة chalet-icon.png في مجلد public) */}
      <img src="/chalet-icon.png" alt="chalet" className="w-12 h-12 hover:scale-110 transition-transform drop-shadow-lg" />
      
      {/* اسم الشاليه القادم من الداتابيز */}
      <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-70 px-2 py-1 rounded text-xs whitespace-nowrap font-bold">
        {chalet.name_en}
      </span>
    </div>
  );
}