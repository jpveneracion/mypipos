#!/usr/bin/env node

/**
 * Vercel Environment Setup Script
 * Helps users set up required environment variables for Vercel deployment
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Required environment variables
const requiredVars = [
  {
    name: 'DATABASE_URL',
    description: 'Neon PostgreSQL connection string',
    placeholder: 'postgresql://user:password@host/database?sslmode=require',
    examples: ['Get your connection string from https://console.neon.tech/']
  },
  {
    name: 'PI_API_URL',
    description: 'Pi Network API endpoint',
    placeholder: 'https://api.testnet.minepi.com/v2',
    choices: ['https://api.testnet.minepi.com/v2', 'https://api.minepi.com/v2'],
    default: 'https://api.testnet.minepi.com/v2'
  },
  {
    name: 'PI_API_KEY',
    description: 'Pi Network API key',
    placeholder: 'your-pi-api-key-here',
    examples: ['Get your API key from https://developers.minepi.com']
  },
  {
    name: 'PI_WALLET_ADDRESS',
    description: 'Pi Network platform wallet address',
    placeholder: 'your-pi-wallet-address-here',
    examples: ['Your wallet address for A2U payments (starts with G or similar)']
  },
  {
    name: 'PI_WALLET_PRIVATE_KEY',
    description: 'Pi Network wallet private key',
    placeholder: 'your-wallet-private-key-here',
    examples: ['⚠️  Keep this secure! Never share or commit to git'],
    secure: true
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Your application URL',
    placeholder: 'http://localhost:3000',
    examples: ['Development: http://localhost:3000', 'Production: https://your-domain.vercel.app'],
    default: 'http://localhost:3000'
  },
  {
    name: 'NEXTAUTH_SECRET',
    description: 'NextAuth secret key',
    placeholder: 'generate-with-openssl-rand-base64-32',
    examples: ['Generate with: openssl rand -base64 32'],
    generate: true
  },
  {
    name: 'NEXTAUTH_URL',
    description: 'NextAuth URL',
    placeholder: 'http://localhost:3000',
    default: 'http://localhost:3000'
  },
  {
    name: 'NODE_ENV',
    description: 'Environment mode',
    placeholder: 'development',
    choices: ['development', 'production'],
    default: 'development'
  }
];

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function generateSecret() {
  return require('crypto').randomBytes(32).toString('base64');
}

async function setupEnvironment() {
  console.log('🚀 myPiPOS Vercel Environment Setup\n');
  console.log('This script will help you set up required environment variables.\n');

  const envVars = {};

  for (const envVar of requiredVars) {
    console.log(`\n📝 ${envVar.name}`);
    console.log(`   ${envVar.description}`);

    if (envVar.examples) {
      console.log('   Examples:');
      envVar.examples.forEach(example => {
        console.log(`   - ${example}`);
      });
    }

    if (envVar.choices) {
      console.log('   Options:');
      envVar.choices.forEach((choice, index) => {
        console.log(`   ${index + 1}. ${choice}`);
      });

      const choiceIndex = await question(`   Choose (1-${envVar.choices.length}) [${envVar.choices.indexOf(envVar.default) + 1}]: `);
      const index = parseInt(choiceIndex) - 1 || envVar.choices.indexOf(envVar.default);
      envVars[envVar.name] = envVar.choices[index];
    } else if (envVar.generate) {
      const useGenerated = await question(`   Auto-generate secure value? [Y/n]: `);
      if (useGenerated.toLowerCase() !== 'n') {
        envVars[envVar.name] = generateSecret();
        console.log(`   ✅ Generated: ${envVars[envVar.name].substring(0, 10)}...`);
      } else {
        envVars[envVar.name] = await question(`   Enter value: `);
      }
    } else {
      const defaultVal = envVar.default || '';
      const input = await question(`   Enter value [${defaultVal}]: `);
      envVars[envVar.name] = input || defaultVal;
    }
  }

  // Show summary
  console.log('\n\n✨ Environment Variables Summary:\n');
  Object.entries(envVars).forEach(([key, value]) => {
    const displayValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
    console.log(`${key}=${displayValue}`);
  });

  // Ask to save
  const saveChoice = await question('\n💾 Save to .env.local? [Y/n]: ');

  if (saveChoice.toLowerCase() !== 'n') {
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Saved to .env.local');

    // Also update .env.example
    const exampleContent = Object.entries(envVars)
      .map(([key, value]) => {
        const placeholder = requiredVars.find(v => v.name === key)?.placeholder || value;
        return `${key}=${placeholder}`;
      })
      .join('\n');

    fs.writeFileSync('.env.example', `# myPiPOS Environment Variables\n# Copy this file to .env.local and update with your values\n\n${exampleContent}`);
    console.log('✅ Updated .env.example');
  }

  // Vercel setup instructions
  console.log('\n\n🚀 Next Steps:\n');
  console.log('1. Deploy to Vercel:');
  console.log('   vercel login');
  console.log('   vercel --prod');
  console.log('\n2. Or set environment variables in Vercel dashboard:');
  console.log('   - Go to Project Settings → Environment Variables');
  console.log('   - Add each variable from the summary above');
  console.log('\n3. After deployment, test your application:\n');

  rl.close();
}

// Run the setup
setupEnvironment().catch(console.error);