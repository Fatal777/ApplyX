/**
 * SkillsEditor Component
 * Form for editing skills section using rich text editor
 */

import { Wrench } from "lucide-react";
import RichTextEditor from "../RichTextEditor";
import { useResumeBuilderStore } from "@/store/resumeBuilderStore";

const SkillsEditor = () => {
    const { activeDocument, updateSkillsContent } = useResumeBuilderStore();
    const skillsContent = activeDocument?.skillsContent || "";

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Skills
                </h2>
            </div>

            <p className="text-sm text-gray-500">
                Add your technical and soft skills. Use formatting to organize them by category.
            </p>

            <RichTextEditor
                content={skillsContent}
                onChange={updateSkillsContent}
                placeholder={`<p><strong>Technical Skills:</strong></p>
<ul>
  <li>JavaScript, TypeScript, React, Node.js</li>
  <li>Python, FastAPI, PostgreSQL</li>
  <li>Docker, AWS, CI/CD</li>
</ul>
<p><strong>Soft Skills:</strong></p>
<ul>
  <li>Team Leadership, Agile/Scrum</li>
  <li>Problem Solving, Communication</li>
</ul>`}
            />
        </div>
    );
};

export default SkillsEditor;
