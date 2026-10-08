import React, { useEffect, useState } from "react";

const App = () => {
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    window.electronAPI.getPlatform().then(setPlatform);
  }, []);
  return (
    <main>
      <h1>{window.electronAPI.appName}</h1>
      <p>Running on: {platform}</p>
    </main>
  );
};

export default App;
