export default function LayoutAnim() {
  return (
    <>
      <style>{`
        @keyframes slide-bad {
          from { left: 0px; top: 0px; }
          to { left: 200px; top: 100px; }
        }
        .bad-anim {
          position: absolute;
          width: 100px;
          height: 100px;
          background: red;
          animation: slide-bad 2s infinite;
        }
      `}</style>
      <div>
        <h1>Layout-Triggering Animation</h1>
        <div className="bad-anim" />
      </div>
    </>
  );
}
