'use client';
import { useState } from 'react';

export default function ImgCls() {
  const [show, setShow] = useState(false);

  return (
    <div>
      <h1>Image CLS</h1>
      <p>Text that will shift when image loads</p>
      <button onClick={() => setShow(true)}>Load Image</button>
      {show && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="https://picsum.photos/800/600" alt="No dimensions" />
      )}
      <p>More text below that will shift</p>
    </div>
  );
}
