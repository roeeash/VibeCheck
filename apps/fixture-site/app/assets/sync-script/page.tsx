export default function SyncScript() {
  return (
    <>
      <div>
        <h1>Synchronous Script</h1>
        <p>This page loads a render-blocking script.</p>
        {/* Simulate via a Data URL script — no async/defer */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <script src="data:text/javascript,console.log('sync')" />
      </div>
    </>
  );
}
