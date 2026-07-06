async function testRegister() {
  const payload = {
    email: "test_" + Date.now() + "@example.com",
    password: "Password123!",
    first_name: "Test",
    last_name: "User",
    middle_name: "",
    gender: "male",
    date_of_birth: "1990-01-01",
    current_country: 161,
    current_state: 1,
    current_city: 1,
    state_of_origin: 1,
    role: "partymember",
    role_level: "member"
  };

  try {
    const response = await fetch("http://localhost:4000/api/v1/auth/register-candidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testRegister();
