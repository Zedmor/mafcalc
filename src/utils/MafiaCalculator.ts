import {Action, Redness, Suspicion} from "../models/models";

export interface PlayerInfo {
    player: number;
    redness: number;
    triplets: { players: [number, number, number]; probability: number }[];
    va: number[];
}

export interface GraphData {
    nodes: { id: number; x: number; y: number }[];
    edges: { source: number; target: number; weight: number }[];
}

interface ProcessedData {
    playerInfo: PlayerInfo[];
    graphs: {
        blackTogetherGraph: GraphData;
        relationshipsGraph: GraphData;
    };
    eliminatedPlayers: number[];
}

export function combinations<T>(array: T[], size: number): T[][] {
    function combine(input: T[], length: number, start: number, result: T[], results: T[][]) {
        if (length === 0) {
            results.push(result.slice());
            return;
        }
        for (let i = start; i <= input.length - length; i++) {
            result.push(input[i]);
            combine(input, length - 1, i + 1, result, results);
            result.pop();
        }
    }

    const results: T[][] = [];
    combine(array, size, 0, [], results);
    return results;
}

function isSubset<T>(set: Set<T>, subset: Set<T>): boolean {
    if (subset === undefined) {
        return true;
    }
    for (const elem of subset) {
        if (!set.has(elem)) {
            return false;
        }
    }
    return true;
}

function hasIntersection<T>(setA: Set<T>, setB: Set<T>): boolean {
    if (setA === undefined) {
        return false;
    }
    if (setB === undefined) {
        return false;
    }
    for (const elem of setB) {
        if (setA.has(elem)) {
            return true;
        }
    }
    return false;
}


export class MafiaCalculator {
    public blackChecks: Map<number, Set<number>> = new Map();
    public redChecks: Map<number, Set<number>> = new Map();
    public blackTogetherGraph: GraphData = {nodes: [], edges: []};
    public relationshipsGraph: GraphData = {nodes: [], edges: []};
    public players: number[] = Array.from({length: 10}, (_, i) => i + 1);
    public eliminatedPlayers: Set<number> = new Set();
    public votingStage: boolean = false;
    public secondVotingStage: boolean = false;
    public expectingVel: boolean = false;
    public votes: Map<number, number> = new Map();
    public messages: string[] = [];

    constructor() {
        this.initializeGraphs();
    }

    get sheriffs(): Set<number> {
        const sheriffs = new Set<number>();
        this.blackChecks.forEach((_, key) => sheriffs.add(key));
        this.redChecks.forEach((_, key) => sheriffs.add(key));
        return sheriffs;
    }


    private initializeGraphs() {
        this.players.forEach(player => {
            this.blackTogetherGraph.nodes.push({id: player, x: 0, y: 0});
            this.relationshipsGraph.nodes.push({id: player, x: 0, y: 0});
        });

        for (let i = 0; i < this.players.length; i++) {
            for (let j = i + 1; j < this.players.length; j++) {
                const player1 = this.players[i];
                const player2 = this.players[j];
                this.blackTogetherGraph.edges.push({source: player1, target: player2, weight: 1.0});
                this.relationshipsGraph.edges.push({source: player1, target: player2, weight: 6 / 9});
                this.relationshipsGraph.edges.push({source: player2, target: player1, weight: 6 / 9});
            }
        }
    }

    handleVoting(eventStr: string): [number | null, string | null, number | number[] | null] {
        const [targetStr, votersStr] = eventStr.split(":");
        const target = parseInt(targetStr.trim(), 10);
        // Split by any combination of spaces and commas
        const voters = votersStr.trim().split(/[\s,]+/).map(voter => parseInt(voter, 10));

        // Calculate the number of active players excluding the target
        const activePlayers = this.players.filter(p => !this.eliminatedPlayers.has(p) && p !== target);

        // Determine if the vote is significant
        const votersSet = new Set(voters);
        const nonVoters = activePlayers.filter(p => !votersSet.has(p));

        let actionCode = 'v'; // Default to significant vote

        if (voters.length <= 1 || nonVoters.length <= 1) {
            // Insignificant if only one player voted or only one player didn't vote
            actionCode = 'vs';
        }

        return [target, actionCode, voters];
    }

    private applySingleRedness(source: number, target: number) {
        const relationshipEdge = this.relationshipsGraph.edges.find(edge =>
            edge.source === source && edge.target === target
        );
        if (relationshipEdge) {
            const rednessInstance = new Redness(source, target);
            const expectedWeight = Math.max(0, Math.min(1, (6 / 9) * (1 - rednessInstance.getStrength())));
            relationshipEdge.weight = expectedWeight;
        }
    }


    private applyRednessToMultipleTargets(source: number, targets: number[]) {
        targets.forEach(target => {
            this.applySingleRedness(source, target);
        });
    }


    parseEvent(eventStr: string): [number | null, string | null, number | number[] | null] {
        // Check if we are expecting a 'vel' or 'novel' command due to a tie in voting

        const multipleRedness = this.parseMultipleRednessTargets(eventStr);
        if (multipleRedness) {
            return multipleRedness;
        }


        if (this.expectingVel) {
            if (eventStr === 'vel') {
                this.eliminateBothPlayers();
                this.expectingVel = false;
            } else if (eventStr === 'novel') {
                this.keepBothPlayers();
                this.expectingVel = false;
                this.secondVotingStage = false;
            } else {
                this.messages.push("Tie in voting, expected 'vel' or 'novel' command.");
            }
            return [null, null, null];
        }

        // Handle voting notation
        if (eventStr.includes(":")) {
            return this.handleVoting(eventStr)
        }


        // Check if we are in a voting stage
        if (this.votingStage) {
            this.messages.push("Voting block incomplete, all players must vote before proceeding.");
            return [null, "Voting block incomplete", null];
        }

        // Match the event string against the expected pattern
        const match = eventStr.match(/(\d+)([a-zA-Z]+)?(\d+)?/);
        if (match) {
            const source = parseInt(match[1], 10);
            const action = match[2] || '';
            const target = match[3] ? parseInt(match[3], 10) : null;
            return [source, action, target];
        } else {
            this.messages.push("Invalid event string format");
            return [null, null, null];
        }
    }

    private parseMultipleRednessTargets(eventStr: string): [number, string, number[]] | null {
        const match = eventStr.match(/(\d+)\+([0-9]+)/);
        if (match) {
            const source = parseInt(match[1], 10);
            const targetsStr = match[2];
            const targets = targetsStr.split('').map(char => {
                const num = parseInt(char, 10);
                return num === 0 ? 10 : num; // Interpret '0' as '10'
            });
            return [source, 'r', targets];
        }
        return null;
    }


    applyEvent(source: number, action: string, target: number | number[] | null) {
        action = action.toLowerCase();

        if (action === 'r' && Array.isArray(target)) {
            this.applyRednessToMultipleTargets(source, target);
            return;
        }


        if ((action === "v" || action === "vs") && Array.isArray(target)) {
            // Handle voting
            if (!this.votingStage) {
                this.votingStage = true;
                this.votes.clear();
            }
            target.forEach(voter => {
                this.votes.set(voter, source); // Record that 'voter' voted for 'source'
                if (new Set([...this.votes.keys(), ...this.eliminatedPlayers]).size === this.players.length) {
                    // All players voted
                    this.resolveVoting();
                    this.votingStage = false;
                }
                this._applySingleEvent(source, action, voter as number);

            });


        } else {
            this._applySingleEvent(source, action, target as number);
        }
    }


    private applySheriffChecks(source: number, action: string, target: number) {
        if (action === 'cb') {
            if (!this.blackChecks.has(source)) {
                this.blackChecks.set(source, new Set());
            }
            this.blackChecks.get(source)!.add(target);
        } else if (action === 'cr') {
            if (!this.redChecks.has(source)) {
                this.redChecks.set(source, new Set());
            }
            this.redChecks.get(source)!.add(target);
        }

        if (this.sheriffs.size > 1) {
            const sheriffsArray = Array.from(this.sheriffs);
            for (let i = 0; i < sheriffsArray.length; i++) {
                for (let j = i + 1; j < sheriffsArray.length; j++) {
                    const a = sheriffsArray[i];
                    const b = sheriffsArray[j];
                    this.updateGraphWeights(a, b);
                }
            }
        }
    }

    private updateGraphWeights(a: number, b: number) {
        const relationshipEdge = this.relationshipsGraph.edges.find(edge => edge.source === a && edge.target === b);
        const blackTogetherEdge = this.blackTogetherGraph.edges.find(edge => edge.source === a && edge.target === b);

        if (relationshipEdge) {
            relationshipEdge.weight = 0;
        }
        if (blackTogetherEdge) {
            blackTogetherEdge.weight = 0;
        }
    }


    private _applySingleEvent(source: number, action: string, target: number) {

        if (action === 'cr' || action === 'cb') {
            this.applySheriffChecks(source, action, target);
        }

        const ActionClass = this.getActionClassForAction(action);
        if (!ActionClass) {
            this.messages.push(`Unknown action: ${action}`);
            return; // Unknown action
        }

        // Ensure ActionClass is a concrete subclass
        const event = new ActionClass(source, target) as Action;

        if (action === 'e' || action === 'es' || action === 'eo') {
            this._applyEliminationEvent(source, event);
            return;
        }

        // Update probability graph (blackTogetherGraph)
        const blackTogetherEdge = this.blackTogetherGraph.edges.find(edge =>
            (edge.source === source && edge.target === target) ||
            (edge.source === target && edge.target === source)
        );
        if (blackTogetherEdge) {
            const currentWeight = blackTogetherEdge.weight;
            const newWeight = currentWeight * (1 - (event.getBreakingWeight() ?? 0));
            blackTogetherEdge.weight = Math.max(newWeight, 0.01); // Avoid zero
        }

        // Update relationships graph
        const relationshipEdge = this.relationshipsGraph.edges.find(edge =>
            edge.source === source && edge.target === target
        );
        if (relationshipEdge) {
            const currentStrength = relationshipEdge.weight;
            if (action === 'cr') {
                relationshipEdge.weight = 1;
                const reverseEdge = this.relationshipsGraph.edges.find(edge =>
                    edge.source === target && edge.target === source
                );
                if (reverseEdge) {
                    reverseEdge.weight *= (1 - (event.getReverseStrength() ?? 0));
                }
            } else {
                const newStrength = Math.max(0, Math.min(1, currentStrength * (1 - (event.getStrength() ?? 0))));
                relationshipEdge.weight = newStrength;

                const reverseEdge = this.relationshipsGraph.edges.find(edge =>
                    edge.source === target && edge.target === source
                );
                if (reverseEdge) {
                    reverseEdge.weight *= (1 - (event.getReverseStrength() ?? 0));
                }

                if (action === 'cb') {
                    if (reverseEdge) {
                        reverseEdge.weight = 0;
                    }
                    relationshipEdge.weight = 0;
                }
            }
        }
    }


    private getActionClassForAction(action: string): typeof Action | null {
        return Action.getClassForAction(action);
    }


    private _applyEliminationEvent(player: number, action: Action) {
        const multiplier = 1 - (action.getBreakingWeight() ?? 0);

        // Update the weights in the blackTogetherGraph for all neighbors of the eliminated player
        this.blackTogetherGraph.edges.forEach(edge => {
            if (edge.source === player || edge.target === player) {
                edge.weight *= multiplier;
            }
        });

        // Mark the player as eliminated
        this.eliminatedPlayers.add(player);
    }


    private getCandidates(): number[] {
        const voteCounts: Map<number, number> = new Map();

        // Count the votes for each player
        this.votes.forEach((target, voter) => {
            if (!voteCounts.has(target)) {
                voteCounts.set(target, 0);
            }
            voteCounts.set(target, voteCounts.get(target)! + 1);
        });

        // Determine the maximum number of votes received by any player
        const maxVotes = Math.max(...voteCounts.values());

        // Collect all players who received the maximum number of votes
        const candidates: number[] = [];
        voteCounts.forEach((count, player) => {
            if (count === maxVotes) {
                candidates.push(player);
            }
        });

        return candidates;
    }


    private resolveVoting() {
        const candidates = this.getCandidates();

        if (candidates.length === 1) {
            // If there is a single candidate, eliminate that player
            this.eliminatePlayer(candidates[0]);
            this.votingStage = false;
            this.secondVotingStage = false;
            this.expectingVel = false;
        } else if (candidates.length > 1) {
            // If there is a tie and it's the first voting stage, move to the second voting stage
            if (!this.secondVotingStage) {
                this.secondVotingStage = true;
                this.votes.clear(); // Clear votes for the second round
            } else if (this.secondVotingStage) {
                // If it's the second voting stage and there's still a tie, expect a 'vel' or 'novel' command
                this.expectingVel = true;
            }
        }
    }

    private eliminatePlayer(player: number) {
        // Add the player to the set of eliminated players
        this.eliminatedPlayers.add(player);

        // Additional logic can be added here if needed
        // For example, you might want to update the graphs or notify other components

        // Example: Log a message or notify other components
        this.messages.push(`Player ${player} has been eliminated.`);
    }

    validTriplet(a: number, b: number, c: number): boolean {
        const setRepr = new Set([a, b, c]);

        // Check conditions for a single sheriff
        if (this.sheriffs.size === 1) {
            const sheriff = Array.from(this.sheriffs)[0];
            if (!isSubset(setRepr, this.blackChecks.get(sheriff)!)) {
                return false;
            }
            if (hasIntersection(this.redChecks.get(sheriff)!, setRepr)) {
                return false;
            }

            if (setRepr.has(sheriff)) {
                return false;
            }
        }

        // Check conditions for two sheriffs
        if (this.sheriffs.size === 2) {
            const [sheriffA, sheriffB] = Array.from(this.sheriffs);
            if (setRepr.has(sheriffA) && setRepr.has(sheriffB)) {
                return false;
            }
        }

        const doubleRedPlayers = this.getDoubleRedPlayers();

        // Validate triplet against red checks
        for (const p of setRepr) {
            for (const sheriff of this.sheriffs) {
                if (this.redChecks.get(sheriff)?.has(p) && !setRepr.has(sheriff)) {
                    return false;
                }
            }
            if (doubleRedPlayers.has(p)) {
                return false;
            }
        }

        // Ensure at least one sheriff is in the triplet if there are multiple sheriffs
        if (this.sheriffs.size > 1 && !Array.from(setRepr).some(p => this.sheriffs.has(p))) {
            return false;
        }

        // Check if all players in the triplet are eliminated
        if ([a, b, c].every(player => this.eliminatedPlayers.has(player))) {
            return false;
        }

        // Check mafia count condition
        const nonEliminatedCount = this.players.length - this.eliminatedPlayers.size;
        const mafiaCount = [a, b, c].filter(player => !this.eliminatedPlayers.has(player)).length;
        if (mafiaCount / nonEliminatedCount >= 0.5) {
            return false;
        }

        // If the triplet contains at least one non-eliminated player and the game condition is not met, it's valid
        return [a, b, c].some(player => !this.eliminatedPlayers.has(player));
    }


    public generateTriplets(player: number): { players: [number, number, number]; probability: number }[] {
        const otherPlayers = this.players.filter(p => p !== player);
        const triplets: { players: [number, number, number]; probability: number }[] = [];

        // Identify black checks for the player
        const blackChecks = this.blackChecks.get(player) || new Set();

        // Generate all combinations of three players from the other players
        for (let i = 0; i < otherPlayers.length; i++) {
            for (let j = i + 1; j < otherPlayers.length; j++) {
                for (let k = j + 1; k < otherPlayers.length; k++) {
                    const a = otherPlayers[i];
                    const b = otherPlayers[j];
                    const c = otherPlayers[k];

                    // Ensure the triplet includes all black-checked players
                    if (blackChecks.size > 1 && !Array.from(blackChecks).every(check => [a, b, c].includes(check))) {
                        continue;
                    }

                    // Ensure the triplet includes all black-checked players if the player is a sheriff
                    if (this.sheriffs.has(player) && !Array.from(blackChecks).every(check => [a, b, c].includes(check))) {
                        continue;
                    }

                    // Check if the player is checked as black by any sheriff
                    let validTriplet = true;
                    for (const [sheriff, blackChecks] of this.blackChecks.entries()) {
                        if (blackChecks.has(player)) {
                            // The triplet must include the sheriff
                            if (![a, b, c].includes(sheriff)) {
                                validTriplet = false;
                                break;
                            }
                            // The triplet should not include any player that the sheriff has checked as black
                            if (Array.from(blackChecks).some(check => [a, b, c].includes(check))) {
                                validTriplet = false;
                                break;
                            }
                        }
                    }


                    if (!this.validTriplet(a, b, c)) {
                        continue;
                    }

                    if (!validTriplet) {
                        continue;
                    }


                    const prob = (
                        this.getEdgeWeight(this.blackTogetherGraph, a, b) * (1 - this.getEdgeWeight(this.relationshipsGraph, player, a)) *
                        this.getEdgeWeight(this.blackTogetherGraph, a, c) * (1 - this.getEdgeWeight(this.relationshipsGraph, player, b)) *
                        this.getEdgeWeight(this.blackTogetherGraph, b, c) * (1 - this.getEdgeWeight(this.relationshipsGraph, player, c))
                    );

                    triplets.push({players: [a, b, c], probability: prob});
                }
            }
        }

        // Sort triplets by probability in descending order and return the top 10
        triplets.sort((a, b) => b.probability - a.probability);
        return triplets.slice(0, 10);
    }


    public getEdgeWeight(graph: GraphData, source: number, target: number): number {
        const edge = graph.edges.find(e => (e.source === source && e.target === target) || (e.source === target && e.target === source));
        return edge ? edge.weight : 0;
    }

    calculateRedness(player: number): number {
        let weightSum = 0;
        let count = 0;

        // Iterate over all edges in the relationshipsGraph
        this.relationshipsGraph.edges.forEach(edge => {
            // Check if the edge is directed towards the player
            if (edge.target === player) {
                weightSum += edge.weight;
                count += 1;
            }
        });

        // Calculate and return the average weight (redness score)
        return count > 0 ? weightSum / count : 0;
    }


    public getPlayerInfo(player: number): PlayerInfo {
        // Calculate the redness score for the player
        const redness = this.calculateRedness(player);

        // Generate possible triplets for the player
        const triplets = this.generateTriplets(player);

        // Calculate the total probability of all triplets
        const totalProb = triplets.reduce((sum, triplet) => sum + triplet.probability, 0);

        // Normalize the probabilities of each triplet
        const normalizedTriplets = triplets.map(triplet => ({
            players: triplet.players,
            probability: totalProb > 0 ? (triplet.probability / totalProb) * 100 : 0
        }));

        // Calculate cumulative probabilities for each player in the triplets
        const playerProbabilities: Map<number, number> = new Map();
        normalizedTriplets.forEach(triplet => {
            triplet.players.forEach(p => {
                if (!playerProbabilities.has(p)) {
                    playerProbabilities.set(p, 0);
                }
                playerProbabilities.set(p, playerProbabilities.get(p)! + triplet.probability);
            });
        });

        // Sort players by cumulative probability
        const sortedPlayers = Array.from(playerProbabilities.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([p]) => p);

        // Return the player information
        return {
            player,
            redness,
            triplets: normalizedTriplets,
            va: sortedPlayers
        };
    }


    public processEvents(events: string[]): ProcessedData {
        events.forEach(eventStr => {
            const [source, action, target] = this.parseEvent(eventStr);
            if (action) {
                this.applyEvent(source as number, action, target as number | number[]);
            }
        });

        const playerInfo = this.players.map(player => this.getPlayerInfo(player));
        return {
            playerInfo,
            graphs: {
                blackTogetherGraph: this.blackTogetherGraph,
                relationshipsGraph: this.relationshipsGraph
            },
            eliminatedPlayers: Array.from(this.eliminatedPlayers)
        };
    }

    public processSingleEvent(eventStr: string) {
        const [source, action, target] = this.parseEvent(eventStr);
        if (action) {
            this.applyEvent(source as number, action, target as number | number[]);
        }
    }

    public eliminateBothPlayers() {
        const candidates = this.getCandidates();
        candidates.forEach(candidate => {
            this.eliminatePlayer(candidate);
        });
        this.votes.clear(); // Clear votes after elimination
        this.votingStage = false;
        this.secondVotingStage = false;
        this.expectingVel = false;
    }

    public keepBothPlayers() {
        this.votes.clear(); // Clear votes to keep both players
        this.votingStage = false;
        this.secondVotingStage = false;
        this.expectingVel = false;
    }

    public sheriffAdvisor(): { player: number; infoGain: number }[] {
        const alivePlayers = this.players.filter(
            (player) => !this.eliminatedPlayers.has(player)
        );

        // Exclude known sheriffs
        const knownSheriffs = Array.from(this.sheriffs).filter((sheriff) =>
            alivePlayers.includes(sheriff)
        );
        const potentialPlayers = alivePlayers.filter(
            (player) => !knownSheriffs.includes(player)
        );

        // Generate possible mafia teams consistent with current info
        const possibleTeams = this.getPossibleMafiaTeams();
        const totalPriorProb = possibleTeams.length;

        if (totalPriorProb === 0) {
            console.log(
                "No possible mafia teams found with the current information."
            );
            return [];
        }

        // Initial entropy
        const currentEntropy = this.calculateEntropy(totalPriorProb);

        const expectedGains: { player: number; infoGain: number }[] = [];

        potentialPlayers.forEach((player) => {
            // Estimate probability that the player is mafia
            const P_mafia = this.calculatePlayerMafiaProbability(player);

            // Simulate checking the player and getting 'mafia' result
            const teamsIfMafia = possibleTeams.filter((team) =>
                team.includes(player)
            );
            const entropyIfMafia = this.calculateEntropy(teamsIfMafia.length);

            // Simulate checking the player and getting 'not mafia' result
            const teamsIfNotMafia = possibleTeams.filter(
                (team) => !team.includes(player)
            );
            const entropyIfNotMafia = this.calculateEntropy(teamsIfNotMafia.length);

            // Expected entropy after checking this player
            const expectedEntropy =
                P_mafia * entropyIfMafia + (1 - P_mafia) * entropyIfNotMafia;

            // Information gain is the difference in entropy
            const informationGain = currentEntropy - expectedEntropy;

            expectedGains.push({player, infoGain: informationGain});
        });

        // Sort players by expected information gain (from highest to lowest)
        expectedGains.sort((a, b) => b.infoGain - a.infoGain);

        // Present the sorted list
        console.log(
            "\nSuggested players to check, sorted by expected information gain (in bits):"
        );
        expectedGains.forEach(({player, infoGain}) => {
            console.log(`Player ${player}: ${infoGain.toFixed(2)} bits`);
        });

        return expectedGains;
    }

    private getPossibleMafiaTeams(): number[][] {
        const possibleTeams: number[][] = [];
        const alivePlayers = this.players.filter(
            (player) => !this.eliminatedPlayers.has(player)
        );

        // Exclude confirmed red players from sheriff red checks
        const confirmedRedPlayers = new Set<number>();
        this.redChecks.forEach((redChecks) => {
            redChecks.forEach((player) => confirmedRedPlayers.add(player));
        });
        const potentialMafiaPlayers = alivePlayers.filter(
            (player) => !confirmedRedPlayers.has(player)
        );

        // Generate combinations of 3 mafia players from potentialMafiaPlayers
        const allTriplets = combinations(potentialMafiaPlayers, 3);

        allTriplets.forEach((triplet) => {
            const [a, b, c] = triplet;
            if (this.validTriplet(a, b, c)) {
                possibleTeams.push(triplet);
            }
        });

        return possibleTeams;
    }

    private calculateEntropy(numTeams: number): number {
        return numTeams > 0 ? Math.log2(numTeams) : 0;
    }

    private calculatePlayerMafiaProbability(player: number): number {
        // Use the inverse of the redness score
        const redness = this.calculateRedness(player);
        const P_mafia = Math.max(0, Math.min(1, 1 - redness));
        return P_mafia;
    }

    public getDoubleRedPlayers() {
        const allRedChecks = Array.from(this.redChecks.values());
        let doubleRedPlayers = new Set<number>();

        if (allRedChecks.length > 0) {
            const playerCountMap = new Map<number, number>();

            // Count occurrences of each player across all sets
            allRedChecks.forEach(set => {
                set.forEach(player => {
                    playerCountMap.set(player, (playerCountMap.get(player) || 0) + 1);
                });
            });

            // Populate doubleRedPlayers with players appearing in more than one set
            playerCountMap.forEach((count, player) => {
                if (count > 1) {
                    doubleRedPlayers.add(player);
                }
            });
        }

        return doubleRedPlayers;
    }
}
