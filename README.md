# Pluto's Pizza Shop

## Getting up and running

Pluto's Pizza Shop uses a stack that mirrors what we use here at Pluto. It's
built with [SvelteKit](https://kit.svelte.dev/), and uses [Supabase](https://supabase.com/)
to manage the database.

Styling is done with [Tailwind](https://tailwindcss.com/), and end-to-end testing
uses [Playwright](https://playwright.dev/) with [Supawright](https://github.com/isaacharrisholt/supawright).

### Prerequisites

- Node.js 18+
- pnpm
- Docker

### Installation

#### 1. Install dependencies

```bash
pnpm install
```

#### 2. Start the Supabase database

Start the Supabase database with `pnpm db:start`. This may take a while to start the
first time around as Supabase is comprised a number of services.

#### 3. Make a .env file using .env.sample

Run

```bash
supabase status
```

Find the appropriate values for 
```
PUBLIC_SUPABASE_URL=""
PUBLIC_SUPABASE_ANON_KEY=""
PRIVATE_SUPABASE_SERVICE_ROLE_KEY=""
```
and add them to a `.env` file. Note that a local docker deployment of supabase does not provide API settings on the dashboard.
The CLI command `supabase status` is the recommended way to fetch this once setup.

### Running the app

Once you've installed the dependencies, you can run the app with `pnpm dev`.

You can preview the production build with `pnpm preview`.

Both will automatically read the environment variables from the `.env` file using
`dotenv-cli`.

### Advancing Orders (API, CLI and Cron)

Look through the commands to advance order to their "next" status via CLI. The commands are admin priveleged.

- Advance all orders: 
`pnpm advance:all` 
- Advance specific order: 
`pnpm advance:order --order=<order-id>` 
- Advance the latest order: 
`pnpm advance:latest` 
- Advance latest order for a specific user by email: 
`pnpm advance:user --email=<user-email>`
- Advance all orders for a specific user by email:
`pnpm advance:user --email=<user-email> --all`
- Start a cron job to run the advancement for all possible orders: 
`pnpm advance_cron:start --minuteFrequency=1 --maxDelayMinutes=10 --allPossible=true` 
- Stop a specific cron job: 
`pnpm advance_cron:stop --cronKey=<cron-key>`, an example would be \
`pnpm advance_cron:stop --cronKey=advanceOrders_419d9cfd-52bb-4640-bb94-bf674abed798_anyUser_latest`
- Stop all cron jobs:
`pnpm advance_cron:stop-all`

A locally created cronJobs.json is used for locally global (i.e. interprocess) cron state management. 
Alternatively and preferably, a database may be used. 

### Database management

Add a database migration with `pnpm db:migrate <migration_name>`. This will create a new
migration file in the `supabase/migrations` directory.

