import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      storeName,
      ownerName,
      ownerEmail,
      ownerPassword,
      phone,
      licenseExpiresAt,
    } = body

    if (
      !storeName ||
      !ownerName ||
      !ownerEmail ||
      !ownerPassword ||
      !licenseExpiresAt
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // -----------------------------------
    // CREATE AUTH USER
    // -----------------------------------

    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true,
        app_metadata: {
          role: 'store_owner',
        },
      })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // -----------------------------------
    // CREATE STORE
    // -----------------------------------

    const { data: store, error: storeError } =
      await adminClient
        .from('stores')
        .insert({
          name: storeName,
          owner_name: ownerName,
          owner_email: ownerEmail,
          phone,
          status: 'active',
          license_expires_at: licenseExpiresAt,
        })
        .select()
        .single()

    if (storeError) {
      return NextResponse.json(
        { error: storeError.message },
        { status: 400 }
      )
    }

    // -----------------------------------
    // UPDATE AUTH METADATA
    // -----------------------------------

    await adminClient.auth.admin.updateUserById(
      authUser.user.id,
      {
        app_metadata: {
          role: 'store_owner',
          storeId: store.id,
        },
      }
    )

    // -----------------------------------
    // CREATE PROFILE
    // -----------------------------------

    const { error: profileError } =
      await adminClient
        .from('profiles')
        .insert({
          id: authUser.user.id,
          store_id: store.id,
          full_name: ownerName,
          email: ownerEmail,
          role: 'store_owner',
          active: true,
        })

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    // -----------------------------------
    // DEFAULT STORE SETTINGS
    // -----------------------------------

    const { error: settingsError } =
await adminClient
  .from('store_settings')
  .insert({
    store_id: store.id,
    store_name: storeName,
    store_address: '',
    store_phone: phone || '',
    store_email: ownerEmail,
    receipt_footer: 'Thank you for your patronage',
    low_stock_threshold: 10,
  })

    if (settingsError) {
      return NextResponse.json(
        { error: settingsError.message },
        { status: 400 }
      )
    }

    // -----------------------------------
    // AUDIT LOG
    // -----------------------------------

    await adminClient
      .from('audit_logs')
      .insert({
        store_id: store.id,
        user_id: authUser.user.id,
        user_full_name: ownerName,
        action: 'STORE_PROVISIONED',
        entity: 'store',
        details: `Store created by master admin`,
      })

    return NextResponse.json({
      success: true,
      storeId: store.id,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Provisioning failed' },
      { status: 500 }
    )
  }
}