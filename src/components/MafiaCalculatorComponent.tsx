import React, { useState, useEffect } from 'react';
import { MafiaCalculator, PlayerInfo } from '../utils/MafiaCalculator';
import '../styles/MafiaCalculatorComponent.css'; // Import the CSS file for styling

// Define the structure of a node
interface Node {
  id: number;
  x: number;
  y: number;
}

// Define the structure of a link
interface Link {
  source: Node;
  target: Node;
}

// Define the structure of the graph data
interface GraphData {
  nodes: Node[];
  links: Link[];
}

const MafiaCalculatorComponent: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<JSX.Element | null>(null);
  const [eliminatedPlayers, setEliminatedPlayers] = useState<string>('');
  const [blackTogetherGraph, setBlackTogetherGraph] = useState<GraphData | null>(null);
  const [relationshipsGraph, setRelationshipsGraph] = useState<GraphData | null>(null);
  const [sheriffAdvisorOutput, setSheriffAdvisorOutput] = useState<{ player: number; infoGain: number }[]>([]);

  useEffect(() => {
    const calculator = new MafiaCalculator();
    const events = input.split('\n').filter((event) => event.trim() !== '');
    calculator.processEvents(events);

    // Get the eliminated players
    setEliminatedPlayers(Array.from(calculator.eliminatedPlayers).join(', '));

    // Get the output from sheriffAdvisor
    const suggestedPlayers = calculator.sheriffAdvisor();
    setSheriffAdvisorOutput(suggestedPlayers);

    setOutput(generateOutput(calculator, events));

    // Transform graph data for visualization
    setBlackTogetherGraph(transformGraphData(calculator.blackTogetherGraph));
    setRelationshipsGraph(transformGraphData(calculator.relationshipsGraph));
  }, [input]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const transformGraphData = (graphData: {
    nodes: { id: number; x: number; y: number }[];
    edges: { source: number; target: number; weight: number }[];
  }): GraphData => {
    const nodeMap = new Map<number, Node>();
    graphData.nodes.forEach((node) => {
      nodeMap.set(node.id, node);
    });
    const links = graphData.edges.map((edge) => ({
      source: nodeMap.get(edge.source)!,
      target: nodeMap.get(edge.target)!,
    }));
    return { nodes: graphData.nodes, links };
  };

  const generateOutput = (calculator: MafiaCalculator, events: string[]): JSX.Element => {
    const playerIds = [9, 10, 1, 2, 8, null, null, 3, 7, 6, 5, 4];
    const playerInfo: (PlayerInfo | null)[] = playerIds.map((id, index) =>
      id !== null ? calculator.getPlayerInfo(id) : null
    );

    return (
      <div>
        <div className="player-info-grid">
          {playerInfo.map((info, index) => (
            <div key={index} className="player-info-cell">
              {info
                ? formatPlayerInfo(info)
                : index === 5
                ? formatSheriffAdvisorOutput(sheriffAdvisorOutput)
                : ''}
            </div>
          ))}
        </div>
        <div className="processed-commands">
          <h2>Processed Commands</h2>
          <div>
            {events.slice(0, 40).map((event, index) => (
              <div key={index}>{event}</div>
            ))}
            {calculator.messages.map((message, index) => (
              <div key={index}>{message}</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const formatPlayerInfo = (info: PlayerInfo): JSX.Element => {
    const totalProb = info.triplets.reduce((sum, triplet) => sum + triplet.probability, 0);
    return (
      <div>
        <strong>Player {info.player} Info:</strong>
        <div>Redness: {info.redness.toFixed(2)}</div>
        {info.triplets.map((triplet, index) => {
          const normalizedProb = totalProb > 0 ? (triplet.probability / totalProb) * 100 : 0;
          return (
            <div key={index}>
              ({triplet.players.join(', ')}), P: {normalizedProb.toFixed(2)}%
            </div>
          );
        })}
        <div>VA: {info.va.join(' ')}</div>
      </div>
    );
  };

  const formatSheriffAdvisorOutput = (
    sheriffAdvisorOutput: { player: number; infoGain: number }[]
  ): JSX.Element => {
    return (
      <div>
        <strong>Sheriff Advisor:</strong>
        {sheriffAdvisorOutput.map(({ player, infoGain }, index) => (
          <div key={index}>
            Player {player}: {infoGain.toFixed(2)} bits
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mafia-calculator-container">
      <div className="text-entry-column">
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Enter commands here..."
          rows={50}
          cols={30} // Adjusted for narrow column
        />
      </div>
      <div className="app-output-column">
        <div className="eliminated-players">
          <strong>Players Eliminated:</strong> {eliminatedPlayers}
        </div>
        <div className="output-container">{output}</div>
      </div>
    </div>
  );
};

export default MafiaCalculatorComponent;