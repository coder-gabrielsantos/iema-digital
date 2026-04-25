import { NextResponse } from 'next/server';
import { connectStudentsDB } from '@/lib/mongodb-connections';
import { getStudentModel } from '@/lib/models/Student';

const TURMAS = ['1A', '1B', '2A', '2B', '3A', '3B'];

const NAMES = [
  'Ana Clara Mendes', 'Bruno Santos Oliveira', 'Carla Ferreira Lima', 'Diego Alves Costa',
  'Elena Rodrigues Silva', 'Felipe Nascimento', 'Gabriela Sousa Pereira', 'Henrique Lima Martins',
  'Isabela Costa Santos', 'João Pedro Alves', 'Karen Oliveira Mendes', 'Lucas Martins Ferreira',
  'Mariana Pereira Costa', 'Nathan Silva Souza', 'Olivia Santos Lima', 'Pedro Henrique Alves',
  'Queila Rodrigues', 'Rafael Costa Pereira', 'Sara Lima Santos', 'Thiago Alves Oliveira',
  'Ursula Ferreira', 'Victor Hugo Costa', 'Wanda Martins Silva', 'Xavier Santos Pereira',
  'Yasmin Lima Costa', 'Zara Oliveira Alves', 'André Silva Mendes', 'Beatriz Costa Ferreira',
  'Carlos Eduardo Lima', 'Daniela Santos Rodrigues', 'Eduardo Pereira Alves', 'Fernanda Lima Souza',
  'Gustavo Santos Costa', 'Helena Alves Martins', 'Igor Ferreira Oliveira', 'Julia Costa Santos',
  'Kevin Martins Lima', 'Larissa Oliveira Pereira', 'Matheus Santos Alves', 'Natalia Costa Silva',
  'Oscar Lima Ferreira', 'Patricia Alves Souza', 'Quirino Santos Oliveira', 'Renata Pereira Martins',
  'Sergio Lima Costa', 'Tatiane Santos Ferreira', 'Ulisses Oliveira Alves', 'Valentina Costa Lima',
  'William Martins Pereira', 'Ximena Santos Rodrigues',
];

export async function POST() {
  const studentsConn = await connectStudentsDB();
  const Student = getStudentModel(studentsConn);

  const existing = await Student.countDocuments();
  if (existing > 0) {
    return NextResponse.json({ message: 'Dados já existem', count: existing });
  }

  const students = NAMES.map((name, index) => {
    const turmaIndex = index % TURMAS.length;
    const classCode = TURMAS[turmaIndex];

    return {
      name,
      classCode,
      photoMime: 'image/jpeg',
      photoData: '',
    };
  });

  await Student.insertMany(students);

  return NextResponse.json({ message: 'Dados criados com sucesso', count: students.length });
}

export async function DELETE() {
  const studentsConn = await connectStudentsDB();
  const Student = getStudentModel(studentsConn);
  await Student.deleteMany({});
  return NextResponse.json({ message: 'Dados removidos com sucesso' });
}
