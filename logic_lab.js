"use strict";


class Node
{
	constructor(op, children)
	{
		this.op = op;
		this.children = children;
	}
}


// The purpose of this class is to prevent me from accidentally
// cloning the tokens array if I were to pass it instead. It also
// ensures that the parsing only takes linear time.
class TokenStream
{
	constructor(tokens)
	{
	    this.tokens = tokens;
	    this.index = 0;
	}

	readChar()
	{
		if (this.index >= this.tokens.length)
		{
			console.log(this.tokens)
			return new Error("Index out of bounds");
		}
		return this.tokens[this.index++];
	}

	peek()
	{
		if (this.index >= this.tokens.length)
		{
			return null;
		}
		return this.tokens[this.index];
	}
}


function parseBracketedExp(tokenStream)
{
	const operators = ["OR", "AND", "NOT", "IMP", "IFF"];

	// Ignore the opening bracket
	tokenStream.readChar();

	let peekVal = tokenStream.peek();

	if (peekVal == "NOT")
	{
		tokenStream.readChar();
		if (tokenStream.peek() == "(")
		{
			let formula = parseBracketedExp(tokenStream);

			// Need to remember to burn the closing bracket
			tokenStream.readChar();
			return new Node("NOT", [formula]);
		}
		else
		{
			// A literal (hopefully)
			let lit = tokenStream.readChar();

			// Need to remember to burn the closing bracket
			tokenStream.readChar();

			return new Node("NOT", [lit]);
		}
	}
	else
	{
		let formula1 = parseExpHelper(tokenStream);
		let op = tokenStream.readChar();

		if (operators.indexOf(op) === -1)
		{
			return new Error(`${op} is not a valid operator.`);
		}

		let formula2 = parseExpHelper(tokenStream);

		// Need to remember to burn the closing bracket
		tokenStream.readChar();

		return new Node(op, [formula1, formula2]);
	}
}


// Call parseExp instead of this function. This function does not check that
// the stream is empty after parsing.
function parseExpHelper(tokenStream)
{
	if (tokenStream.peek() == '(')
	{
		return parseBracketedExp(tokenStream);
	}
	else return tokenStream.readChar();
}


function parseExp(tokenStream)
{
	let formulaTree = parseExpHelper(tokenStream);
	if (tokenStream.peek())
	{
		throw "You have extra tokens at the end of your input (or you forgot to enclose the whole input in brackets).";
	}
	return formulaTree;
}


function tokenize(boolexp)
{
	let startNewString = true;
	let tokens = [];
	for (const ch of boolexp)
	{
		if (ch == ' ')
		{
			startNewString = true;
		}
		else if (ch == '(' || ch == ')')
		{
			tokens.push(ch);
			startNewString = true;
		}
		else
		{
			// character in an operator or a literal
			if (startNewString)
			{
				tokens.push(ch);
			}
			else
			{
				tokens[tokens.length - 1] += ch;
			}
			startNewString = false;
		}
	}
	return tokens;
}


function populateGraphContent(formulaTree, graphContent)
{
	if (!formulaTree.children)
	{
		graphContent.ids[Object.keys(graphContent.ids).length] = formulaTree;
		graphContent.literals.add(formulaTree);
	}
	else
	{
		let childIDs = []

		for (const child of formulaTree.children)
		{
			populateGraphContent(child, graphContent);
			childIDs.push(Object.keys(graphContent.ids).length - 1);
		}

		let myID = Object.keys(graphContent.ids).length;
		graphContent.ids[myID] = formulaTree.op;

		for (const childID of childIDs)
		{
			if (!graphContent.edges[myID])
			{
				graphContent.edges[myID] = [childID];
			}
			else
			{
				graphContent.edges[myID].push(childID);
			}
		}
	}
}


// op is the operation to be applied.
// children is an array of boolean values of the subtrees (from left to right).
// Right now it is only possible to have at most 2 children, but future
// code might need to be able to handle an indeterminate amount
// e.g. (A OR B OR C) has 3 children (not valid input at the moment)
function interpretOP(op, children)
{
	if (op === "NOT")
	{
		if (children.length !== 1)
		{
			throw `Incorrect number of arguments to ${op}.`;
		}
		return !children[0];
	}
	else if (op === "AND")
	{
		if (children.length < 2)
		{
			throw `Incorrect number of arguments to ${op}.`;
		}
		return children.reduce((acc, val) => 
		{
			return (acc && val);
		}, true);
	}
	else if (op === "OR")
	{
		if (children.length < 2)
		{
			throw `Incorrect number of arguments to ${op}.`;
		}
		return children.reduce((acc, val) => 
		{
			return (acc || val);
		}, false);
	}
	else if (op === "IMP")
	{
		if (children.length !== 2)
		{
			throw `Incorrect number of arguments to ${op}.`;
		}

		if (children[0])
		{
			return children[1];
		}
		else
		{
			return true;
		}
	}
	else if (op === "IFF")
	{
		if (children.length !== 2)
		{
			throw `Incorrect number of arguments to ${op}.`;
		}

		return children[0] === children[1];
	}
}

// formulaTree is a tree whose leaves are labelled by literals and whose
// internal nodes are operations.
// truthValues is an object mapping variable names to their boolean truth values.
function interpret(formulaTree, truthValues)
{
	if (!formulaTree.children) // leaf (i.e. literal)
	{
		return truthValues[formulaTree];
	}
	else
	{
		return interpretOP(formulaTree.op, formulaTree.children.map((child) =>
		{
			return interpret(child, truthValues);
		}));
	}
}


function readExp()
{
	try
	{
		document.getElementById('error').innerHTML = "";
		const boolexp = document.getElementById('boolexp').value;
		if (boolexp.length == 0)
		{
			throw "No boolean expression provided.";
		}

		let tokens = tokenize(boolexp);
		let ts = new TokenStream(tokens);
		let formulaTree = parseExp(ts);

		let graphContent = {};
		graphContent.ids = {};
		graphContent.edges = {};

		// Might do some coloring of vertices with this later
		graphContent.literals = new Set();

		populateGraphContent(formulaTree, graphContent);

		loadGraph(graphContent);
	}
	catch (err)
	{
		document.getElementById('error').innerHTML = err;
	}
}


function testAll()
{
	let testInput = "(A AND (B OR (NOT C)))";
	let expectedTokens = ["(", "A", "AND", "(", "B", "OR", "(", "NOT", "C", ")", ")", ")"];
	let tokenizerOutput = tokenize(testInput);

	if (JSON.stringify(tokenizerOutput) !== JSON.stringify(expectedTokens))
	{
		alert("Tokenizer test failed. See console.");
		console.log(expectedTokens);
		console.log(tokenizerOutput);
		return false;
	}

	let notC = new Node("NOT", ["C"]);
	let BorC = new Node("OR", ["B", notC]);
	let AandBorC = new Node("AND", ["A", BorC]);
	let ts = new TokenStream(tokenizerOutput);
	let parserOutput = parseExp(ts);

	if (JSON.stringify(parserOutput) !== JSON.stringify(AandBorC))
	{
		alert("Parser test failed. See console.");
		console.log(AandBorC);
		console.log(parserOutput);
		return false;
	}

	let truthValues = {
		"A": true,
		"B": false,
		"C": true
	};
	let interpreterOutput = interpret(parserOutput, truthValues);

	if (interpreterOutput !== false)
	{
		alert("Interpreter test failed. See console.");
		console.log(interpreterOutput);
		return false;
	}

	console.log("Tests passed.");
	return true;
}

testAll();