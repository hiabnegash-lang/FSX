// A simple beginner-friendly guessing game
const secretNumber = Math.floor(Math.random() * 10) + 1;
const guess = Math.floor(Math.random() * 10) + 1;

console.log(`The secret number is ${secretNumber}.`);
console.log(`Your guess is ${guess}.`);

if (guess === secretNumber) {
	console.log("You guessed correctly!");
} else {
	console.log("Try again!");
}
