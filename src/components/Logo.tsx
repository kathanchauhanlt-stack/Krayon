export default function Logo({ className = "", scale = 1 }: { className?: string; scale?: number }) {
  // We use relative em units for scaling so we can just scale the container font-size
  return (
    <div 
      className={`flex flex-col items-center justify-center font-bangers select-none ${className}`}
      style={{ 
        fontFamily: "'Bangers', cursive",
        transform: `scale(${scale})`,
        transformOrigin: "center"
      }}
    >
      <div className="relative leading-none" style={{ fontSize: "4rem", marginBottom: "-0.2em" }}>
        {/* Outer Black Shadow */}
        <span 
          className="absolute left-0 top-0 w-full text-center"
          style={{ WebkitTextStroke: "10px #111", textShadow: "6px 8px 0 #111", color: "#111", zIndex: 1 }}
        >
          KRAYON
        </span>
        {/* Outer White Stroke */}
        <span 
          className="absolute left-0 top-0 w-full text-center"
          style={{ WebkitTextStroke: "6px #fff", color: "#fff", zIndex: 2 }}
        >
          KRAYON
        </span>
        {/* Inner Black Stroke & Gradient Fill */}
        <span 
          className="relative text-center block"
          style={{ 
            background: "linear-gradient(180deg, #4ad2ff 5%, #ffe330 45%, #ff1c89 95%)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            WebkitTextStroke: "2px #111",
            zIndex: 3 
          }}
        >
          KRAYON
        </span>
      </div>

      <div className="relative leading-none" style={{ fontSize: "2.5rem", zIndex: 10 }}>
        {/* Outer Black Shadow */}
        <span 
          className="absolute left-0 top-0 w-full text-center"
          style={{ WebkitTextStroke: "8px #111", textShadow: "4px 6px 0 #111", color: "#111", zIndex: 1 }}
        >
          CREATION
        </span>
        {/* Outer White Stroke */}
        <span 
          className="absolute left-0 top-0 w-full text-center"
          style={{ WebkitTextStroke: "4px #fff", color: "#fff", zIndex: 2 }}
        >
          CREATION
        </span>
        {/* Inner Black Stroke & Gradient Fill */}
        <span 
          className="relative text-center block"
          style={{ 
            background: "linear-gradient(180deg, #4ad2ff 5%, #ffe330 45%, #ff1c89 95%)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            WebkitTextStroke: "1.5px #111",
            zIndex: 3 
          }}
        >
          CREATION
        </span>
      </div>
    </div>
  );
}
