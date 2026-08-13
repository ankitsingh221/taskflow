import "dotenv/config";

const API_URL =
  process.env.API_URL || "http://localhost:5000";

const TOTAL_JOBS = Number(
  process.env.LOAD_TEST_JOBS || 100
);

const CONCURRENCY = Number(
  process.env.LOAD_TEST_CONCURRENCY || 10
);

async function createJob(index) {
  const response = await fetch(
    `${API_URL}/api/jobs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `load-test-${index}`,
        data: {
          test: true,
          index,
        },
        priority: 5,
        delay: 0,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status}`
    );
  }

  return response.json();
}

async function runLoadTest() {
  console.log("🚀 Starting load test");
  console.log(`Jobs: ${TOTAL_JOBS}`);
  console.log(`Request concurrency: ${CONCURRENCY}`);

  const startTime = Date.now();

  let completed = 0;
  let failed = 0;
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;

      if (index >= TOTAL_JOBS) {
        return;
      }

      try {
        await createJob(index);

        completed++;

        if (completed % 10 === 0) {
          console.log(
            `📤 Submitted ${completed}/${TOTAL_JOBS}`
          );
        }
      } catch (error) {
        failed++;

        console.error(
          `❌ Job ${index} failed:`,
          error.message
        );
      }
    }
  }

  const workers = Array.from(
    { length: CONCURRENCY },
    () => worker()
  );

  await Promise.all(workers);

  const duration =
    (Date.now() - startTime) / 1000;

  console.log("\n📊 Load test completed");

  console.log(
    `Submitted successfully: ${completed}`
  );

  console.log(`Failed requests: ${failed}`);

  console.log(
    `Duration: ${duration.toFixed(2)} seconds`
  );

  console.log(
    `Request throughput: ${(completed / duration).toFixed(
      2
    )} jobs/sec`
  );
}

runLoadTest().catch((error) => {
  console.error(
    "❌ Load test crashed:",
    error
  );

  process.exit(1);
});