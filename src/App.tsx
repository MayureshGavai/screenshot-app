import React, { useEffect, useState } from "react";

const App = () => {
  const [platform, setPlatform] = useState<string>("");
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    window.electronAPI.getPlatform().then(setPlatform);
    window.electronAPI.getScreenSources().then(setSources);
  }, []);

  return (
    <main>
      <h1>{window.electronAPI.appName}</h1>
      <p>Running on: {platform}</p>
      <h2>Screen Sources</h2>
      {sources.map((source) => (
        <div key={source.id}>
          <strong>{source.name}</strong>
          <p>{source.id}</p>
        </div>
      ))}
    </main>
  );
};

export default App;
