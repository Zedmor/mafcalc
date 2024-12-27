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
    weight: number;
}

// Define the structure of the graph data
interface GraphData {
    nodes: Node[];
    links: Link[];
}

const MafiaCalculatorComponent: React.FC = () => {
    const [activePlayer, setActivePlayer] = useState<number | null>(null);
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<JSX.Element | null>(null);
    const [eliminatedPlayers, setEliminatedPlayers] = useState<string>('');
    const [blackTogetherGraph, setBlackTogetherGraph] = useState<GraphData | null>(null);
    const [relationshipsGraph, setRelationshipsGraph] = useState<GraphData | null>(null);
    const [sheriffAdvisorOutput, setSheriffAdvisorOutput] = useState<{ player: number; infoGain: number }[]>([]);
    const [mafiaPlayers, setMafiaPlayers] = useState<number[]>([]); // State to store mafia players

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
    }, [input, activePlayer, mafiaPlayers]); // Added mafiaPlayers as a dependency

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.target.value);
    };

    const handleMafiaToggle = (playerId: number) => {
        setMafiaPlayers((prev) => {
            if (prev.includes(playerId)) {
                return prev.filter((id) => id !== playerId);
            } else {
                if (prev.length >= 3) {
                    // Prevent selecting more than three mafia players
                    return prev;
                }
                return [...prev, playerId];
            }
        });
    };

    const getSortedRelations = () => {
        if (!relationshipsGraph) return null;

        // Define mafias as activePlayer plus selected mafiaPlayers
        const mafias = [activePlayer, ...mafiaPlayers].filter((p): p is number => p !== null);

        if (mafias.length === 0) return null;

        const relationsMap = new Map<number, number>();

        relationshipsGraph.links.forEach((link) => {
            if (mafias.includes(link.target.id)) {
                const otherPlayer = link.source.id;
                if (!relationsMap.has(otherPlayer)) {
                    relationsMap.set(otherPlayer, 0);
                }
                relationsMap.set(otherPlayer, relationsMap.get(otherPlayer)! + link.weight);
            }
        });

        const eliminatedSet = new Set(
            eliminatedPlayers
                .split(', ')
                .filter((p) => p.trim() !== '')
                .map((p) => parseInt(p, 10))
        );

        const relations = Array.from(relationsMap.entries())
            .filter(
                ([player, _]) =>
                    !eliminatedSet.has(player) &&
                    !mafias.includes(player)
            )
            .map(([player, totalWeight]) => ({ player, weight: totalWeight }));

        relations.sort((a, b) => b.weight - a.weight);

        return (
            <div>
                <strong>Resources:</strong>
                {relations.map((relation, index) => (
                    <div key={index}>
                        Player {relation.player}: {relation.weight.toFixed(2)}
                    </div>
                ))}
            </div>
        );
    };

    const transformGraphData = (
        graphData: {
            nodes: { id: number; x: number; y: number }[];
            edges: { source: number; target: number; weight: number }[];
        }
    ): GraphData => {
        const nodeMap = new Map<number, Node>();
        graphData.nodes.forEach((node) => {
            nodeMap.set(node.id, node);
        });

        const links = graphData.edges.map((edge) => ({
            source: nodeMap.get(edge.source)!,
            target: nodeMap.get(edge.target)!,
            weight: edge.weight,
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
                        <div
                            key={index}
                            className={`player-info-cell ${activePlayer === playerIds[index] ? 'active-player' : ''} ${mafiaPlayers.includes(playerIds[index] || -1) ? 'mafia-player' : ''}`}
                            onClick={() => setActivePlayer(playerIds[index])}
                        >
                            {info ? (
                                <div>
                                    <input
                                        type="checkbox"
                                        checked={mafiaPlayers.includes(playerIds[index] || -1)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleMafiaToggle(playerIds[index] || -1);
                                        }}
                                    />
                                    {formatPlayerInfo(info)}
                                </div>
                            ) : index === 5 ? (
                                formatSheriffAdvisorOutput(sheriffAdvisorOutput)
                            ) : index === 6 && activePlayer !== null ? (
                                getSortedRelations()
                            ) : (
                                ''
                            )}
                        </div>
                    ))}
                </div>

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
