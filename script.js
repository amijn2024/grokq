let quizzesData;
let currentClassIndex;
let currentSubjectIndex;
let currentTopicIndex;
let currentQuiz = [];
let currentAnswers = {};
let quizType = ''; // 'daily' or 'topic'

async function loadQuizzes() {
    const response = await fetch('quizzes.json');
    quizzesData = await response.json();
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function initTheme() {
    const themeSelect = document.getElementById('theme-select');
    const savedTheme = localStorage.getItem('theme') || 'default';
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);

    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        localStorage.setItem('theme', theme);
        applyTheme(theme);
    });
}

function applyTheme(theme) {
    document.body.classList.remove('body-default', 'body-night', 'body-system');
    if (theme === 'night') {
        document.body.classList.add('body-night');
    } else if (theme === 'default') {
        document.body.classList.add('body-default');
    } else if (theme === 'system') {
        document.body.classList.add('body-system');
    }
}

// Home page
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    loadQuizzes().then(() => {
        initTheme();
        const startButton = document.getElementById('start-daily-quiz');
        const message = document.getElementById('daily-message');
        const today = new Date().toDateString();
        const lastTaken = localStorage.getItem('dailyQuizTaken');

        if (lastTaken === today) {
            startButton.disabled = true;
            message.textContent = 'You have already taken the daily quiz today.';
        } else {
            startButton.addEventListener('click', () => {
                // Generate 10 random questions from all
                const allQuestions = [];
                quizzesData.classes.forEach(cls => {
                    cls.subjects.forEach(sub => {
                        sub.topics.forEach(top => {
                            allQuestions.push(...top.questions);
                        });
                    });
                });
                const shuffled = allQuestions.sort(() => 0.5 - Math.random());
                currentQuiz = shuffled.slice(0, 10);
                quizType = 'daily';
                localStorage.setItem('currentQuiz', JSON.stringify(currentQuiz));
                localStorage.setItem('quizType', quizType);
                window.location.href = 'quiz.html';
            });
        }
    });
}

// Classes page
if (window.location.pathname.endsWith('classes.html')) {
    loadQuizzes().then(() => {
        initTheme();
        const classesList = document.getElementById('classes-list');
        quizzesData.classes.forEach((cls, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `
                <img src="${cls.thumbnail}" alt="${cls.name}">
                <h3>${cls.name}</h3>
            `;
            card.addEventListener('click', () => {
                window.location.href = `subjects.html?class=${index}`;
            });
            classesList.appendChild(card);
        });
    });
}

// Subjects page
if (window.location.pathname.endsWith('subjects.html')) {
    loadQuizzes().then(() => {
        initTheme();
        currentClassIndex = parseInt(getQueryParam('class'));
        const subjectsList = document.getElementById('subjects-list');
        const classData = quizzesData.classes[currentClassIndex];
        classData.subjects.forEach((sub, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `
                <img src="${sub.thumbnail || 'default-thumbnail.jpg'}" alt="${sub.name}">
                <h3>${sub.name}</h3>
            `;
            card.addEventListener('click', () => {
                window.location.href = `topics.html?class=${currentClassIndex}&subject=${index}`;
            });
            subjectsList.appendChild(card);
        });
    });
}

// Topics page
if (window.location.pathname.endsWith('topics.html')) {
    loadQuizzes().then(() => {
        initTheme();
        currentClassIndex = parseInt(getQueryParam('class'));
        currentSubjectIndex = parseInt(getQueryParam('subject'));
        const topicsList = document.getElementById('topics-list');
        const subjectData = quizzesData.classes[currentClassIndex].subjects[currentSubjectIndex];
        subjectData.topics.forEach((top, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `
                <img src="${top.thumbnail || 'default-thumbnail.jpg'}" alt="${top.name}">
                <h3>${top.name}</h3>
            `;
            card.addEventListener('click', () => {
                currentQuiz = top.questions;
                quizType = `${quizzesData.classes[currentClassIndex].name} - ${subjectData.name} - ${top.name}`;
                localStorage.setItem('currentQuiz', JSON.stringify(currentQuiz));
                localStorage.setItem('quizType', quizType);
                window.location.href = 'quiz.html';
            });
            topicsList.appendChild(card);
        });
    });
}

// Quiz page
if (window.location.pathname.endsWith('quiz.html')) {
    initTheme();
    currentQuiz = JSON.parse(localStorage.getItem('currentQuiz'));
    quizType = localStorage.getItem('quizType');
    const quizContainer = document.getElementById('quiz-container');
    const submitButton = document.getElementById('submit-quiz');

    currentQuiz.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question');
        questionDiv.innerHTML = `<p>${q.question}</p>`; // MathJax will render
        q.options.forEach((opt, optIndex) => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = q.multiple ? 'checkbox' : 'radio';
            input.name = `q${index}`;
            input.value = optIndex;
            label.appendChild(input);
            label.appendChild(document.createTextNode(opt));
            questionDiv.appendChild(label);
        });
        quizContainer.appendChild(questionDiv);
    });
    submitButton.style.display = 'block';
    submitButton.addEventListener('click', () => {
        // Collect answers
        currentQuiz.forEach((q, index) => {
            const inputs = document.querySelectorAll(`input[name="q${index}"]:checked`);
            currentAnswers[index] = Array.from(inputs).map(inp => parseInt(inp.value));
        });
        // Calculate score
        let score = 0;
        let details = [];
        currentQuiz.forEach((q, index) => {
            let correct = Array.isArray(q.correct) ? q.correct.sort() : [q.correct];
            let user = currentAnswers[index] ? currentAnswers[index].sort() : [];
            const isCorrect = JSON.stringify(correct) === JSON.stringify(user);
            if (isCorrect) score++;
            details.push({
                question: q.question,
                userAnswer: user.map(u => q.options[u]),
                correctAnswer: correct.map(c => q.options[c]),
                explanation: q.explanation,
                isCorrect
            });
        });
        const result = {
            date: new Date().toISOString(),
            score,
            total: currentQuiz.length,
            type: quizType,
            details
        };
        let results = JSON.parse(localStorage.getItem('results')) || [];
        results.push(result);
        localStorage.setItem('results', JSON.stringify(results));
        if (quizType === 'daily') {
            localStorage.setItem('dailyQuizTaken', new Date().toDateString());
        }
        window.location.href = 'results.html';
    });

    // Re-render MathJax
    MathJax.typeset();
}

// Results page
if (window.location.pathname.endsWith('results.html')) {
    initTheme();
    let results = JSON.parse(localStorage.getItem('results')) || [];
    const latestResult = results[results.length - 1];
    const latestDiv = document.getElementById('latest-result');
    const previousDiv = document.getElementById('previous-results');

    if (latestResult) {
        latestDiv.innerHTML = `<h2>Latest Result: ${latestResult.type}</h2>
            <p>Score: ${latestResult.score} / ${latestResult.total}</p>`;
        latestResult.details.forEach(d => {
            const detail = document.createElement('div');
            detail.innerHTML = `
                <p>${d.question}</p>
                <p>Your Answer: ${d.userAnswer.join(', ')}</p>
                <p>Correct Answer: ${d.correctAnswer.join(', ')}</p>
                <p>Explanation: ${d.explanation}</p>
                <p>${d.isCorrect ? 'Correct' : 'Wrong'}</p>
            `;
            latestDiv.appendChild(detail);
        });

        // Pie chart
        const pieCtx = document.getElementById('pie-chart').getContext('2d');
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Correct', 'Wrong'],
                datasets: [{
                    data: [latestResult.score, latestResult.total - latestResult.score],
                    backgroundColor: ['green', 'red']
                }]
            }
        });
    }

    // Bar chart for scores over time
    const scores = results.map(r => r.score / r.total * 100);
    const labels = results.map(r => r.date.slice(0,10) + ' ' + r.type);
    const barCtx = document.getElementById('bar-chart').getContext('2d');
    new Chart(barCtx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Score %',
                data: scores,
                backgroundColor: 'blue'
            }]
        }
    });

    // Previous results list
    results.slice(0, -1).reverse().forEach(r => {
        const res = document.createElement('div');
        res.innerHTML = `<h3>${r.type} on ${r.date}</h3><p>Score: ${r.score}/${r.total}</p>`;
        previousDiv.appendChild(res);
    });

    // Re-render MathJax for explanations/questions
    MathJax.typeset();
}