import { motion } from 'framer-motion';
import { FiUsers, FiMessageSquare, FiCheckSquare, FiUserPlus } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

const Collaboration = () => {
  const teamMembers = [
    { name: 'Dr. Rajesh Kumar', role: 'Chief Inspector', status: 'online', cases: 23 },
    { name: 'Priya Sharma', role: 'Field Officer', status: 'away', cases: 15 },
    { name: 'Anil Verma', role: 'Data Analyst', status: 'online', cases: 31 },
    { name: 'Sunita Patel', role: 'Environmental Specialist', status: 'offline', cases: 12 },
  ];

  const tasks = [
    { id: 1, title: 'Investigate illegal site in District A-12', assignee: 'Priya Sharma', status: 'in-progress', priority: 'high' },
    { id: 2, title: 'Verify drone survey results for Block 8', assignee: 'Anil Verma', status: 'pending', priority: 'medium' },
    { id: 3, title: 'Environmental impact assessment - Site Beta', assignee: 'Sunita Patel', status: 'completed', priority: 'high' },
  ];

  const annotations = [
    { user: 'Dr. Rajesh Kumar', time: '2 hours ago', comment: 'Confirmed illegal activity. Recommend immediate field inspection.' },
    { user: 'Anil Verma', time: '5 hours ago', comment: 'AI detection shows 94% confidence. Cross-referenced with historical data.' },
    { user: 'Priya Sharma', time: '1 day ago', comment: 'Ground verification completed. Area matches satellite detection.' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FiUsers className="text-primary" />
            Team Collaboration Hub
          </h1>
          <p className="text-muted-foreground">
            Coordinate with team members, assign tasks, and share investigation notes
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Team Members */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Team Members</h2>
                <Button size="sm">
                  <FiUserPlus className="mr-2" />
                  Add Member
                </Button>
              </div>
              <div className="space-y-4">
                {teamMembers.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors">
                    <Avatar>
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={
                        member.status === 'online' ? 'border-green-500 text-green-500' :
                        member.status === 'away' ? 'border-yellow-500 text-yellow-500' :
                        'border-gray-500 text-gray-500'
                      }>
                        {member.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{member.cases} cases</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Task Assignment */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <FiCheckSquare />
                Assigned Tasks
              </h2>
              <div className="space-y-3 mb-6">
                {tasks.map((task) => (
                  <div key={task.id} className="border border-border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{task.title}</h3>
                      <Badge className={
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in-progress' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }>
                        {task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Assigned to: {task.assignee}</span>
                      <Badge variant="outline" className={task.priority === 'high' ? 'border-destructive text-destructive' : ''}>
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full">
                <FiCheckSquare className="mr-2" />
                Create New Task
              </Button>
            </Card>

            {/* Shared Notes & Comments */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <FiMessageSquare />
                Shared Notes & Comments
              </h2>
              <div className="space-y-4 mb-6">
                {annotations.map((annotation, idx) => (
                  <div key={idx} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {annotation.user.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{annotation.user}</span>
                      <span className="text-xs text-muted-foreground">{annotation.time}</span>
                    </div>
                    <p className="text-sm">{annotation.comment}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Textarea placeholder="Add a note or comment..." className="min-h-[100px]" />
                <Button>Post Comment</Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Collaboration;
