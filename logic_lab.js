"use strict";


class Node
{
	constructor(val, children)
	{
		this.val = val;
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
			return Error("Input ends with blank spaces or nothing.");
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


// This class generates the next truth value for a given interpretation
class InterpStream
{
	// Literals is an array of strings
	constructor(formulaTree, literals)
	{
		this.formulaTree = formulaTree;
	    this.literals = literals;
	    this.index = 0;
	    this.max = Math.pow(2, literals.length)
	}

	next()
	{
		if (this.index < this.max)
		{
			let truthValues = {};
			for (let i = 0; i < this.literals.length; ++i)
			{
				truthValues[this.literals[this.literals.length - i - 1]] = ((this.index >> i) & 1);
			}
			++this.index;
			return interpret(this.formulaTree, truthValues);
		}
	}
}


const operators = ["OR", "AND", "NOT", "IMP", "IFF"];


function isLiteral(literal)
{
	return operators.concat(["(", ")", null]).indexOf(literal) === -1;
}


function parseBracketedExp(tokenStream)
{
	// Ignore the opening bracket
	if (tokenStream.readChar() !== '(')
	{
		return Error("Expected an opening bracket.");
	}

	if (tokenStream.peek() == "NOT")
	{
		// Read the NOT
		tokenStream.readChar();
		if (tokenStream.peek() == "(")
		{
			let formula = parseBracketedExp(tokenStream);

			if (formula instanceof Error)
			{
				return formula;
			}

			// Need to remember to burn the closing bracket
			if (tokenStream.readChar() !== ')')
			{
				return Error("Expected a closing bracket.");
			}
			return new Node("NOT", [formula]);
		}
		else if (isLiteral(tokenStream.peek()))
		{
			let lit = tokenStream.readChar();

			// Need to remember to burn the closing bracket
			if (tokenStream.readChar() !== ')')
			{
				return Error("Expected a closing bracket.");
			}

			let litNode = new Node(lit, []);
			return new Node("NOT", [litNode]);
		}
		else
		{
			return Error("Expected a literal or a formula, got " + tokenStream.peek() + ".");
		}
	}
	else
	{
		let formula1 = parseExpHelper(tokenStream);

		if (formula1 instanceof Error)
		{
			return formula1;
		}

		let op = tokenStream.readChar();
		if (op instanceof Error)
		{
			return op;
		}

		if (operators.indexOf(op) === -1)
		{
			return Error(op + " is not a valid operator.");
		}

		let formula2 = parseExpHelper(tokenStream);
		if (formula2 instanceof Error)
		{
			return formula2;
		}

		// Need to remember to burn the closing bracket
		if (tokenStream.readChar() !== ')')
		{
			return Error("Expected a closing bracket.");
		}

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
	else
	{
		let literal = tokenStream.readChar();
		if (literal instanceof Error)
		{
			return literal;
		}

		if (!isLiteral(literal))
		{
			return Error("Expected a literal, got '" + literal + "'.");
		}

		return new Node(literal, []);
	}
}


function parseExp(tokenStream)
{
	let formulaTree = parseExpHelper(tokenStream);

	if (formulaTree instanceof Error)
	{
		return formulaTree;
	}

	if (tokenStream.peek())
	{
		return Error("You have extra tokens at the end of your input (or you forgot to enclose the whole input in brackets).");
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


// op is the operation to be applied.
// children is an array of boolean values of the subtrees (from left to right).
// Right now it is only possible to have at most 2 children, but future
// code might need to be able to handle an indeterminate amount
// e.g. (A OR B OR C) has 3 children (not valid input at the moment)
function interpretOP(op, children)
{
	if (children.some((child) =>
	{
		return (child instanceof Error);
	}))
	{
		return Error("At least one child has an error.");
	}

	if (op === "NOT")
	{
		if (children.length !== 1)
		{
			return Error("Incorrect number of arguments to " + op + ". NOT takes exactly one argument.");
		}
		return !children[0];
	}
	else if (op === "AND")
	{
		if (children.length < 2)
		{
			return Error("Incorrect number of arguments to " + op + ". AND takes at least two arguments.");
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
			return Error("Incorrect number of arguments to " + op + ". OR takes at least two arguments.");
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
			return Error("Incorrect number of arguments to " + op + ". IMP takes exactly two arguments.");
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
			return Error("Incorrect number of arguments to " + op + ". IFF takes exactly two arguments.");
		}

		return children[0] === children[1];
	}
}


// formulaTree is a tree whose leaves are labelled by literals and whose
// internal nodes are operations.
// truthValues is an object mapping variable names to their boolean truth values.
function interpret(formulaTree, truthValues)
{
	if (!formulaTree.children.length) // leaf (i.e. literal)
	{
		return truthValues[formulaTree.val];
	}
	else
	{
		let interpretChild = (child) =>
		{
			return interpret(child, truthValues);
		}

		return interpretOP(formulaTree.val, formulaTree.children.map(interpretChild));
	}
}


function populateGraphContent(tree, graphContent, isBDD, leavesMap)
{
	if (!tree.children.length)
	{
		graphContent.ids[Object.keys(graphContent.ids).length] = tree.val;
	}
	else
	{
		let childIDs = [];

		for (const child of tree.children)
		{
			if (isBDD && !child.children.length)
			{
				if (child.val in leavesMap)
				{
					childIDs.push(leavesMap[child.val]);
				}
				else
				{
					let leafID = Object.keys(graphContent.ids).length;
					childIDs.push(leafID);
					leavesMap[child.val] = leafID;
					graphContent.ids[leafID] = child.val;

					if (child.val === true)
					{
						graphContent.colors[leafID] = "#afa";
					}
					else if (child.val === false)
					{
						graphContent.colors[leafID] = "#faa";
					}
				}
			}
			else
			{
				populateGraphContent(child, graphContent, isBDD, leavesMap);
				childIDs.push(Object.keys(graphContent.ids).length - 1);
			}
		}

		let myID = Object.keys(graphContent.ids).length;
		graphContent.ids[myID] = tree.val;

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


function displayFormulaTree(formulaTree, literals)
{
	let graphContent = {};
	graphContent.ids = {};
	graphContent.edges = {};
	graphContent.colors = {};

	populateGraphContent(formulaTree, graphContent, false, null);
	loadGraph(graphContent, "formula tree");
}


function displayBDD(bdd)
{
	let graphContent = {};
	graphContent.ids = {};
	graphContent.edges = {};
	graphContent.colors = {};

	populateGraphContent(bdd, graphContent, true, {});
	loadGraph(graphContent, "BDD");
}


function makeBDDHelper(interpstream, depth, literals, trueNode, falseNode)
{
	if (depth < literals.length)
	{
		let ifFalse = makeBDDHelper(interpstream, depth + 1, literals, trueNode, falseNode);
		let ifTrue = makeBDDHelper(interpstream, depth + 1, literals, trueNode, falseNode);

		return new Node(literals[depth], [ifFalse, ifTrue]);
	}
	else
	{
		// If the interpretation is true, return the shared true node, else
		// return the shared false node
		if (interpstream.next())
		{
			return trueNode;
		}
		else
		{
			return falseNode;
		}
	}
}


// literals is an ARRAY of literals
function makeBDD(formulaTree, literals)
{
	let interpstream = new InterpStream(formulaTree, literals);
	let trueNode = new Node(true, []);
	let falseNode = new Node(false, []);
	return makeBDDHelper(interpstream, 0, literals, trueNode, falseNode);
}


// This function reads the boolean expression in the input box and parses it into a
// formula tree. It returns the tree and a set of the literals.
function readExp()
{
	let err = document.getElementById("error");
	err.innerHTML = "&nbsp";
	const boolexp = document.getElementById("boolexp").value;
	if (boolexp.length == 0)
	{
		err.innerHTML = "No boolean expression provided.";
		return Error("No boolean expression provided.");
	}

	let tokens = tokenize(boolexp);
	let ts = new TokenStream(tokens);
	let formulaTree = parseExp(ts);

	if (formulaTree instanceof Error)
	{
		err.innerHTML = formulaTree.message;
	}

	let literals = new Set(tokens.filter(isLiteral));
	return {
		formulaTree: formulaTree,
		literals: literals
	};
}


function displayGraph()
{
	let err = document.getElementById("error");

	let readObject = readExp();

	if (readObject instanceof Error)
	{
		// Already logged the error in readExp()
		return;
	}

	let formulaTree = readObject.formulaTree;
	let literals = readObject.literals;

	if (document.getElementById("displayFormulaTree").checked)
	{
		displayFormulaTree(formulaTree, literals);
	}
	else if (document.getElementById("displayBDD").checked)
	{
		let bdd = makeBDD(formulaTree, Array.from(literals));
		displayBDD(bdd);
	}
	else
	{
		err.innerHTML = "Nothing selected";
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
		console.log("Expected: ");
		console.log(expectedTokens);
		console.log("Actual: ");
		console.log(tokenizerOutput);
		return false;
	}

	let A = new Node("A", []);
	let B = new Node("B", []);
	let C = new Node("C", []);
	let notC = new Node("NOT", [C]);
	let BornotC = new Node("OR", [B, notC]);
	let AandBornotC = new Node("AND", [A, BornotC]);

	let ts = new TokenStream(tokenizerOutput);
	let parserOutput = parseExp(ts);

	if (JSON.stringify(parserOutput) !== JSON.stringify(AandBornotC))
	{
		alert("Parser test failed. See console.");
		console.log("Expected: ");
		console.log(AandBornotC);
		console.log("Actual: ");
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
		console.log("Expected: false");
		console.log("Actual: ");
		console.log(interpreterOutput);
		return false;
	}

	console.log("Tests passed.");
	return true;
}

testAll();