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

// Do not call this function. It does not check that the stream is empty after parsing.
function parseExpHelper(tokenStream)
{
	if (tokenStream.peek() == '(')
	{
		return parseBracketedExp(tokenStream);
	}
	else return tokenStream.readChar();
}

// Call this function.
function parseExp(tokenStream)
{
	let formulaTree = parseExpHelper(tokenStream);
	if (tokenStream.peek())
	{
		return new Error("You have extra tokens at the end of your input (or you forgot to enclose the whole input in brackets.");
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

function readExp()
{
	const boolexp = document.getElementById('boolexp').value;
	if (boolexp.length == 0)
	{
		alert("No boolean expression provided.");
		return;
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