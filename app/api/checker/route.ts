import { NextResponse } from 'next/server';
export async function POST(){return NextResponse.json({ok:false,message:'Usá el cotizador integrado para registrar tu solicitud.'},{status:410});}
