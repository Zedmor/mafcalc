import React, { useState } from 'react';
import CommandInput from './CommandInput';
import { processEvents } from '../utils/MafiaCalculator';
import PlayerInfo from './PlayerInfo';
import GraphVisualization from './GraphVisualization';
import ProcessedCommands from './ProcessedCommands';

const App: React.FC = () => {
  const [commands, setCommands] = useState<string[]>([]);
  const [playerInfo, setPlayerInfo] = useState<any[]>([]);
  const [graphs, setGraphs] = useState<any>({});
  const [eliminatedPlayers, setEliminatedPlayers] = useState<number[]>([]);

  const handleCommandsChange = (newCommands: string[]) => {
    setCommands(newCommands);
    const { playerInfo, graphs, eliminatedPlayers } = processEvents(newCommands);
    setPlayerInfo(playerInfo);
    setGraphs(graphs);
    setEliminatedPlayers(eliminatedPlayers);
  };

  return (
    <div className="App">
      <CommandInput onChange={handleCommandsChange} />
      <GraphVisualization graphs={graphs} />
      <div className="player-info">
        {playerInfo.map(info => (
          <PlayerInfo key={info.player} info={info} />
        ))}
      </div>
      <ProcessedCommands commands={commands} eliminatedPlayers={eliminatedPlayers} />
    </div>
  );
};

export default App;
