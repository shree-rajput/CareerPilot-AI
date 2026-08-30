const API_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log("==================================================");
  console.log("STARTING 5-INTERVIEW UNIQUE QUESTION TEST");
  console.log("==================================================");

  try {
    // 1. Register a test user
    const testEmail = `testuser_${Date.now()}@example.com`;
    const registerRes = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Test User",
        email: testEmail,
        password: "Password123!"
      })
    });
    const registerData = await registerRes.json();
    const token = registerData.accessToken;

    console.log(`Test user created: ${testEmail}`);

    const questions = [];

    // 2. Run 5 interview attempts
    for (let i = 1; i <= 5; i++) {
      console.log(`\n--- Attempt ${i} ---`);
      
      const createRes = await fetch(`${API_URL}/interview`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetRole: "Frontend Developer",
          technologyStack: ["React", "JavaScript", "CSS"],
          interviewType: "technical",
          difficulty: "medium",
          numberOfQuestions: 10
        })
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.data) {
        throw new Error(`Failed to create session: ${JSON.stringify(createData)}`);
      }
      const sessionId = createData.data._id;
      console.log(`Created Session ID: ${sessionId}`);

      // Get first question
      let questionRes, questionData;
      let retries = 0;
      while (retries < 3) {
        try {
          questionRes = await fetch(`${API_URL}/interview/${sessionId}/question`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (questionRes.status === 202) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            retries++;
          } else {
            questionData = await questionRes.json();
            break;
          }
        } catch (err) {
          console.error("Error fetching question:", err.message);
          break;
        }
      }

      const qData = questionData?.data?.data;
      if (qData) {
        console.log(`Question: "${qData.questionText}"`);
        questions.push(qData.questionText);
        
        // We must mark it as answered so that the NEXT session considers it a past question
        // Wait, the status is "asked" when it's returned.
        // `crossSessionQuestions` fetches questions with status IN ["asked", "answered"].
        // So just returning it is enough! The status is "asked" in the DB.
        
      } else {
        console.log("Failed to get question.");
      }
    }

    console.log("\n==================================================");
    console.log("TEST RESULTS");
    console.log("==================================================");
    questions.forEach((q, i) => console.log(`Attempt ${i+1}: ${q}`));
    
    // Check for exact duplicates
    const uniqueQuestions = new Set(questions);
    if (uniqueQuestions.size === questions.length) {
      console.log("\nSUCCESS: All 5 first questions are unique!");
    } else {
      console.log("\nFAILED: There are duplicate questions.");
    }

  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

runTest();
